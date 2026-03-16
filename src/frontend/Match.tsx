import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './style.css';
import 'bootstrap/dist/css/bootstrap.min.css';

type TeamId = 'Red' | 'Blue';

type MatchPlayer = {
	puuid: string;
	name: string;
	tag: string;
	team_id: TeamId;
	account_level?: number;
	agent?: {
		id?: string;
		name?: string;
	};
	tier?: {
		id?: number;
		name?: string;
	};
	stats?: {
		score?: number;
		kills?: number;
		deaths?: number;
		assists?: number;
		damage?: {
			dealt?: number;
			received?: number;
		};
	};
	customization?: {
		card?: string;
	};
};

type MatchRound = {
	id: number;
	result: string;
	winning_team: TeamId;
};

type MatchTeam = {
	team_id: TeamId;
	won: boolean;
	rounds: {
		won: number;
		lost: number;
	};
};

type MatchData = {
	metadata: {
		match_id: string;
		started_at?: string;
		game_length_in_ms?: number;
		map?: {
			id?: string;
			name?: string;
		};
		queue?: {
			name?: string;
			mode_type?: string;
		};
		season?: {
			short?: string;
		};
		cluster?: string;
	};
	players: MatchPlayer[];
	teams: MatchTeam[];
	rounds: MatchRound[];
};

function formatMatchLength(durationMs?: number) {
	if (!durationMs) return '--';
	const totalSeconds = Math.floor(durationMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function formatMatchDate(dateString?: string) {
	if (!dateString) return '--';
	return new Date(dateString).toLocaleString();
}

function getTeamLabel(teamId: TeamId) {
	return teamId === 'Red' ? 'Defenders' : 'Attackers';
}

function getSortedTeamPlayers(players: MatchPlayer[], teamId: TeamId) {
	return players
		.filter((player) => player.team_id === teamId)
		.sort((firstPlayer, secondPlayer) => (secondPlayer.stats?.score ?? 0) - (firstPlayer.stats?.score ?? 0));
}

function getPlayerProfilePath(player: MatchPlayer) {
	return `/profile/${encodeURIComponent(`${player.name}#${player.tag}`)}`;
}

function getPlayerCardImage(player: MatchPlayer) {
	return player.customization?.card
		? `https://media.valorant-api.com/playercards/${player.customization.card}/wideart.png`
		: 'https://media.valorant-api.com/playercards/f1711d20d-4b1c-c64a-14be-d4ae58a457c6/wideart.png';
}

function getPlayerCardBackground(player: MatchPlayer) {
	return `linear-gradient(90deg, rgba(12, 12, 12, 0.72) 0%, rgba(12, 12, 12, 0.38) 42%, rgba(12, 12, 12, 0.62) 100%), url(${getPlayerCardImage(player)})`;
}

function getAgentIcon(player: MatchPlayer) {
	return player.agent?.id
		? `https://media.valorant-api.com/agents/${player.agent.id}/displayicon.png`
		: undefined;
}

function getPlayerKey(player: MatchPlayer) {
	return player.puuid;
}

function Match() {
	const navigate = useNavigate();
	const params = useParams();
	const [matchData, setMatchData] = useState<MatchData | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isMatchMissing, setIsMatchMissing] = useState(false);
	const [isDownloadingMatch, setIsDownloadingMatch] = useState(false);
	const [playerInDatabase, setPlayerInDatabase] = useState<Record<string, boolean>>({});
	const [downloadingPlayers, setDownloadingPlayers] = useState<Record<string, boolean>>({});

	useEffect(() => {
		async function fetchMatch() {
			setIsMatchMissing(false);
			if (!params.matchId) {
				setErrorMessage('Match ID not found.');
				setIsLoading(false);
				return;
			}

			try {
				const response = await fetch(`http://127.0.0.1:5110/match/${encodeURIComponent(params.matchId)}`);

				if (response.status === 404) {
					setErrorMessage('This match is not in the database yet.');
					setIsMatchMissing(true);
					setIsLoading(false);
					return;
				}

				if (!response.ok) {
					throw new Error(`Error: ${response.status}`);
				}

				const data = await response.json();
				setMatchData(data);
				setErrorMessage(null);
			} catch (error) {
				console.error('Request failed:', error);
				setErrorMessage('Unable to load the match right now.');
			} finally {
				setIsLoading(false);
			}
		}

		fetchMatch();
	}, [params.matchId]);

	async function handleDownloadMissingMatch() {
		if (!params.matchId) {
			return;
		}

		setIsDownloadingMatch(true);
		try {
			const response = await fetch(`http://127.0.0.1:5110/downloadMatch/${encodeURIComponent(params.matchId)}`);
			if (!response.ok) {
				throw new Error(`Error: ${response.status}`);
			}
			window.location.reload();
		} catch (error) {
			console.error('Match download failed:', error);
			setErrorMessage('Unable to download this match right now.');
		} finally {
			setIsDownloadingMatch(false);
		}
	}

	useEffect(() => {
		async function fetchPlayerStatuses() {
			if (!matchData?.players?.length) {
				return;
			}

			const uniquePlayers = Array.from(new Set(matchData.players.map((player) => getPlayerKey(player))));

			const checks = await Promise.all(
				uniquePlayers.map(async (playerKey) => {
					try {
						const response = await fetch(`http://127.0.0.1:5110/playerExists/${encodeURIComponent(playerKey)}`);
						if (!response.ok) {
							return [playerKey, false] as const;
						}
						const payload = await response.json();
						return [playerKey, Boolean(payload?.exists)] as const;
					} catch (error) {
						console.error('Player exists check failed:', error);
						return [playerKey, false] as const;
					}
				})
			);

			setPlayerInDatabase(Object.fromEntries(checks));
		}

		fetchPlayerStatuses();
	}, [matchData]);

	async function handleDownloadPlayer(player: MatchPlayer) {
		const playerKey = getPlayerKey(player);
		setDownloadingPlayers((previous) => ({ ...previous, [playerKey]: true }));

		try {
			const response = await fetch(`http://127.0.0.1:5110/downloadPlayer/${encodeURIComponent(playerKey)}`);
			if (!response.ok) {
				throw new Error(`Error: ${response.status}`);
			}
			setPlayerInDatabase((previous) => ({ ...previous, [playerKey]: true }));
		} catch (error) {
			console.error('Player download failed:', error);
		} finally {
			setDownloadingPlayers((previous) => ({ ...previous, [playerKey]: false }));
		}
	}

	if (isLoading) {
		return <div className="text-white">Loading match...</div>;
	}

	if (!params.matchId || !matchData) {
		return (
			<div className="match-page-shell">
				<div className="Chipcard match-header-card">
					<h3>{errorMessage ?? 'Match not found.'}</h3>
					<div className="mt-3">
						{isMatchMissing ? (
							<button className="profile-match-download-button" onClick={handleDownloadMissingMatch} disabled={isDownloadingMatch}>
								{isDownloadingMatch ? 'Downloading...' : 'Download Match'}
							</button>
						) : null}
						<button onClick={() => navigate(-1)}>Go Back</button>
					</div>
				</div>
			</div>
		);
	}

	const redTeam = matchData.teams.find((team) => team.team_id === 'Red');
	const blueTeam = matchData.teams.find((team) => team.team_id === 'Blue');
	const redPlayers = getSortedTeamPlayers(matchData.players, 'Red');
	const bluePlayers = getSortedTeamPlayers(matchData.players, 'Blue');
	const mapBackgroundImage = matchData.metadata.map?.id
		? `https://media.valorant-api.com/maps/${matchData.metadata.map.id}/splash.png`
		: undefined;

	function renderProfileAction(player: MatchPlayer) {
		const playerKey = getPlayerKey(player);
		const isDownloading = Boolean(downloadingPlayers[playerKey]);
		const exists = playerInDatabase[playerKey];

		if (exists) {
			return (
				<Link to={getPlayerProfilePath(player)} className="match-player-link">
					<button className="match-profile-button">Open Profile</button>
				</Link>
			);
		}

		return (
			<div className="match-player-link">
				<button className="match-profile-button" onClick={() => { handleDownloadPlayer(player); }} disabled={isDownloading}>
					{isDownloading ? 'Downloading...' : 'Download Player'}
				</button>
			</div>
		);
	}

	return (
		<div className="match-page-shell">
			<div className="row">
				<div
					className="Chipcard match-header-card match-map-hero w-100"
					style={mapBackgroundImage ? { backgroundImage: `linear-gradient(rgba(19, 19, 19, 0.55), rgba(19, 19, 19, 0.88)), url(${mapBackgroundImage})` } : undefined}
				>
					<div className="container p-md-1">
						<div className="row align-items-center g-3">
							<div className="col-lg text-start">
								<div className="match-map-nameplate">
									<h2 className="text-white mb-1">{matchData.metadata.map?.name ?? 'Unknown Map'}</h2>
									<p className="match-subtitle mb-0">{matchData.metadata.season?.short ?? 'Season unavailable'}</p>
								</div>
								<p className="match-subtitle mb-0">
									{matchData.metadata.queue?.name ?? matchData.metadata.queue?.mode_type ?? 'Match'}
									{' · '}
									{formatMatchDate(matchData.metadata.started_at)}
								</p>
							</div>
							<div className="col-lg-auto">
								<div className="match-scoreboard-summary">
									<div className="team-score-pill team-score-pill-red">
										<span>{redTeam?.rounds.won ?? 0}</span>
										<small>Red</small>
									</div>
									<div className="match-score-divider">VS</div>
									<div className="team-score-pill team-score-pill-blue">
										<span>{blueTeam?.rounds.won ?? 0}</span>
										<small>Blue</small>
									</div>
								</div>
							</div>
							<div className="col-lg-auto text-start text-lg-end">
								<p className="match-subtitle mb-1">Length: {formatMatchLength(matchData.metadata.game_length_in_ms)}</p>
								<p className="match-subtitle mb-0">Server: {matchData.metadata.cluster ?? '--'}</p>
							</div>
						</div>

						<div className="match-rounds-timeline mt-4">
							{matchData.rounds.map((round) => (
								<div key={round.id} className="match-round-item">
									<div
										className={`round-tile ${round.winning_team === 'Red' ? 'round-tile-red' : 'round-tile-blue'}`}
										title={`Round ${round.id + 1}: ${round.result}`}
									>
										<span className="round-number">{round.id + 1}</span>
										<span className="round-result">{round.result || 'Time	'}</span>
									</div>
									{round.id === 11 ? (
										<div className="round-swap-tile" title="Teams swap sides after round 12">
											<span className="round-swap-label">SWAP</span>
											<span className="round-swap-copy">Side change</span>
										</div>
									) : null}
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className="row g-4 align-items-start">
				<div className="col-xl-6">
					<div className="match-team-panel match-team-panel-red">
						<div className="match-team-header">
							<div>
								<h3 className="mb-1">Red Team</h3>
								<p className="match-subtitle mb-0">{getTeamLabel('Red')}</p>
							</div>
							<div className="match-team-total">{redTeam?.rounds.won ?? 0} rounds</div>
						</div>

						{redPlayers.map((player) => (
							<div
								className="match-player-card"
								key={player.puuid}
								style={{ backgroundImage: getPlayerCardBackground(player) }}
							>
								<div className="match-player-content">
									<div className="match-player-main">
										<div className="match-player-identity">
											<h4 className="mb-1 text-white">{player.name}#{player.tag}</h4>
											<p className="match-subtitle mb-0">{player.tier?.name ?? 'Unknown Rank'}</p>
										</div>
										<div className="match-player-right-meta">
											<div className="match-player-score">{player.stats?.score ?? 0} ACS</div>
											<div className="match-agent-chip">
												{getAgentIcon(player) ? (
													<img src={getAgentIcon(player)} className="match-agent-icon" alt={player.agent?.name ?? 'Agent'} />
												) : null}
												<span>{player.agent?.name ?? 'Unknown Agent'}</span>
											</div>
										</div>
									</div>
									<div className="match-player-stats-grid">
										<div><span>KDA</span><strong>{player.stats?.kills ?? 0}/{player.stats?.deaths ?? 0}/{player.stats?.assists ?? 0}</strong></div>
										<div><span>Damage</span><strong>{player.stats?.damage?.dealt ?? 0}</strong></div>
										<div><span>Level</span><strong>{player.account_level ?? 0}</strong></div>
									</div>
									{renderProfileAction(player)}
								</div>
							</div>
						))}
					</div>
				</div>

				<div className="col-xl-6">
					<div className="match-team-panel match-team-panel-blue">
						<div className="match-team-header">
							<div>
								<h3 className="mb-1">Blue Team</h3>
								<p className="match-subtitle mb-0">{getTeamLabel('Blue')}</p>
							</div>
							<div className="match-team-total">{blueTeam?.rounds.won ?? 0} rounds</div>
						</div>

						{bluePlayers.map((player) => (
							<div
								className="match-player-card"
								key={player.puuid}
								style={{ backgroundImage: getPlayerCardBackground(player) }}
							>
								<div className="match-player-content">
									<div className="match-player-main">
										<div className="match-player-identity">
											<h4 className="mb-1 text-white">{player.name}#{player.tag}</h4>
											<p className="match-subtitle mb-0">{player.tier?.name ?? 'Unknown Rank'}</p>
										</div>
										<div className="match-player-right-meta">
											<div className="match-player-score">{player.stats?.score ?? 0} ACS</div>
											<div className="match-agent-chip">
												{getAgentIcon(player) ? (
													<img src={getAgentIcon(player)} className="match-agent-icon" alt={player.agent?.name ?? 'Agent'} />
												) : null}
												<span>{player.agent?.name ?? 'Unknown Agent'}</span>
											</div>
										</div>
									</div>
									<div className="match-player-stats-grid">
										<div><span>KDA</span><strong>{player.stats?.kills ?? 0}/{player.stats?.deaths ?? 0}/{player.stats?.assists ?? 0}</strong></div>
										<div><span>Damage</span><strong>{player.stats?.damage?.dealt ?? 0}</strong></div>
										<div><span>Level</span><strong>{player.account_level ?? 0}</strong></div>
									</div>
									{renderProfileAction(player)}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="mt-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
				<Link to="/" className="align-self-center">
					<button>Back To Home</button>
				</Link>
				<button onClick={() => navigate(-1)}>Back</button>
			</div>
		</div>
	);
}

export default Match;
