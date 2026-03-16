import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './style.css';
import 'bootstrap/dist/css/bootstrap.min.css';

type LeaderboardPlayer = {
	_id: string;
	history: any[];
	Sumofkills: number;
	stats?: Array<{
		_id: string;
		name: string;
		tag: string;
		card: string;
		region: string;
		account_level: number;
	}>;
};

function Leaderboard() {
	const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		async function fetchTop10() {
			try {
				const response = await fetch('http://127.0.0.1:5110/top10Players');

				if (!response.ok) {
					throw new Error(`Error: ${response.status}`);
				}

				const data = await response.json();
				setPlayers(data);
				setErrorMessage(null);
			} catch (error) {
				console.error('Failed to fetch top 10 players:', error);
				setErrorMessage('Unable to load leaderboard.');
			} finally {
				setIsLoading(false);
			}
		}

		fetchTop10();
	}, []);

	if (isLoading) {
		return <div className="text-white">Loading leaderboard...</div>;
	}

	if (!players.length) {
		return <div className="text-white">No players found in leaderboard.</div>;
	}

	return (
		<div className="leaderboard-page">
			<div className="row">
				<div className="Chipcard leaderboard-header mb-4">
					<h2 className="text-white">Top 10 Players</h2>
					<p className="text-muted">Ranked by Total Kills</p>
				</div>
			</div>

			{errorMessage && <div className="text-danger mb-3">{errorMessage}</div>}

			<div className="leaderboard-container">
				{players.map((player, index) => {
					const playerStats = player.stats?.[0];
					const playerName = playerStats?.name ?? 'Unknown';
					const playerTag = playerStats?.tag ?? 'NA';
					const playerCard = playerStats?.card ?? 'f1711d20d-4b1c-c64a-14be-d4ae58a457c6';
					const bankImageUrl = `https://media.valorant-api.com/playercards/${playerCard}/wideart.png`;

					return (
						<div className="row" key={player._id}>
							<div
								className="Chipcard leaderboard-player-card"
								style={{
									backgroundImage: `linear-gradient(90deg, rgba(12, 12, 12, 0.78) 0%, rgba(12, 12, 12, 0.42) 42%, rgba(12, 12, 12, 0.72) 100%), url(${bankImageUrl})`,
								}}
							>
								<div className="container p-md-1">
									<div className="row align-items-center g-3">
										<div className="col-auto leaderboard-rank">
											<div className="rank-badge">{index + 1}</div>
										</div>
										<div className="col-auto leaderboard-player-info">
											<Link
												to={`/profile/${encodeURIComponent(`${playerName}#${playerTag}`)}`}
												className="text-decoration-none"
											>
												<h4 className="text-white mb-0">{playerName}#{playerTag}</h4>
											</Link>
										</div>
										<div className="col leaderboard-stat">
											<p className="leaderboard-stat-label">Total Kills</p>
											<h5 className="text-white mb-0">{player.Sumofkills}</h5>
										</div>
										<div className="col-md-auto d-flex justify-content-end">
											<Link
												to={`/profile/${encodeURIComponent(`${playerName}#${playerTag}`)}`}
												className="align-self-center"
											>
												<button className="profile-match-open-button">View Profile</button>
											</Link>
										</div>
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			<div className="mt-4 d-flex justify-content-start">
				<Link to="/">
					<button>Back To Home</button>
				</Link>
			</div>
		</div>
	);
}

export default Leaderboard;
