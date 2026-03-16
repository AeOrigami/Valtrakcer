import { useParams, Link , useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import './style.css'
import 'bootstrap/dist/css/bootstrap.min.css'

function getMatchOutcome(match: any) {
    return match?.stats?.haswon ? "Victory" : "Defeat";
}

function getMatchOutcomeClass(match: any) {
    return match?.stats?.haswon ? "profile-match-win" : "profile-match-loss";
}

function Profile() {
    const navigate = useNavigate();
    const params = useParams();
    const [recentGames, setRecentGames] = useState<any[]>([]);
    const [playerPuuid, setPlayerPuuid] = useState<string | null>(null);
    const [playerCardId, setPlayerCardId] = useState<string | null>(null);
    const [rankId, setRank] = useState<string | null>(null);
    const [rr , setRR]= useState<string | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
    const [refreshStatus, setRefreshStatus] = useState<"success" | "error" | null>(null);

    const fetchProfile = useCallback(async () => {
        if (!params.username) return;

        try {
            const response = await fetch(
                `http://127.0.0.1:5110/profile/${encodeURIComponent(params.username)}`
            );

            if (response.status == 404 || response.status == 400) {
                navigate("/profile/notfound");
                return;
            }

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const data = await response.json();
            const lastGame = data?.[1]?.history?.[0];

            setPlayerPuuid(data?.[0]?._id ?? null);
            setPlayerCardId(data?.[0]?.card ?? null);
            setRecentGames(data?.[1]?.history || []);
            setRank(lastGame?.tier?.id ?? null);
            setRR(lastGame?.rr?.toString?.() ?? lastGame?.ranking_in_tier?.toString?.() ?? "0");
            setUsername(`${data[0].name}#${data[0].tag}`);
        } catch (error) {
            console.error("Request failed:", error);
        }
    }, [params.username, navigate]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleRefresh = async () => {
        if (!playerPuuid) return;
        setIsRefreshing(true);
        setRefreshMessage(null);
        setRefreshStatus(null);
        try {
            const response = await fetch(
                `http://127.0.0.1:5110/refresh/${encodeURIComponent(playerPuuid)}`,
                { method: "POST" }
            );
            if (!response.ok) {
                throw new Error(`Refresh failed: ${response.status}`);
            }
            await fetchProfile();
            setRefreshMessage("Profile refreshed successfully.");
            setRefreshStatus("success");
        } catch (error) {
            console.error("Refresh failed:", error);
            setRefreshMessage("Could not refresh profile. Please try again.");
            setRefreshStatus("error");
        } finally {
            setIsRefreshing(false);
        }
    };

    if (!params.username) {
        return <div className="text-white">Username not found.</div>;
    }
    else {
        const profileCardImage = playerCardId
            ? `https://media.valorant-api.com/playercards/${playerCardId}/wideart.png`
            : "https://media.valorant-api.com/playercards/F1711d20d-4b1c-c64a-14be-d4ae58a457c6/wideart.png";

        return (
            <>
                <div className="row">
                    <div
                        className="Chipcard profile-hero-card"
                        style={{ backgroundImage: `linear-gradient(90deg, rgba(12, 12, 12, 0.78) 0%, rgba(12, 12, 12, 0.42) 42%, rgba(12, 12, 12, 0.72) 100%), url(${profileCardImage})` }}
                    >
                        <Link to="/" className="profile-home-button">&#8592; Home</Link>
                        <div className="container align-content-center p-md-1 profile-hero-content">
                            <div className="row align-items-center">
                                <div className="col-auto profile-hero-nameplate">
                                    <h3 className="profile-hero-name">{username ?? "-1"}</h3>
                                </div>
                                <div className="col-auto d-flex flex-column align-items-center profile-rank-panel">
                                    <img
                                        src={rankId
                                            ? `https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/${rankId}/smallicon.png`
                                            : "https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/1/smallicon.png"
                                        }
                                        className="rank-img mb-1"
                                        alt="rank"
                                    />
                                    <h5 className="mb-0 lh-1">{rr ?? "-1"}/100</h5>
                                </div>
                                <div className="col d-flex justify-content-end">
                                    <button
                                        className="profile-match-download-button"
                                        onClick={handleRefresh}
                                        disabled={isRefreshing || !playerPuuid}
                                    >
                                        {isRefreshing ? "Refreshing..." : "Refresh"}
                                    </button>
                                </div>
                            </div>
                            {refreshMessage && (
                                <div className="row mt-2">
                                    <div className="col text-end">
                                        <span className={refreshStatus === "success" ? "text-success" : "text-danger"}>
                                            {refreshMessage}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <h4 className="text-white mt-4 text-start">Recent Games:</h4>

                {recentGames.map((match) => (
                    match?.stats ? (
                        <div className="row" key={match.match_id}>
                            <div className={`Chipcard-match profile-match-card ${getMatchOutcomeClass(match)}`}>
                                <div className="container p-md-1">
                                    <div className="row align-items-center g-3">
                                        <div className="col-lg-auto text-start">
                                            <span className={`profile-match-badge ${getMatchOutcomeClass(match)}`}>{getMatchOutcome(match)}</span>
                                            <h3 className="mb-1 mt-2">{match.map.name}</h3>
                                            <p className="profile-match-meta mb-0">{match.date}</p>
                                        </div>
                                        <div className="col-md-auto text-start">
                                            <p className="profile-match-label mb-1">Final Score</p>
                                            <h5 className="mb-0">{match?.stats?.finalscore_won}/{match?.stats?.finalscore_lost}</h5>
                                        </div>
                                        <div className="col-md-auto text-start">
                                            <p className="profile-match-label mb-1">KDA</p>
                                            <h5 className="mb-0">{match?.stats?.kills ?? 0}/{match?.stats?.deaths ?? 0}/{match?.stats?.assists ?? 0}</h5>
                                        </div>
                                        <div className="col-md-auto text-start">
                                            <p className="profile-match-label mb-1">Rank Delta</p>
                                            <h5 className="mb-0">{match.last_change}</h5>
                                        </div>
                                        <div className="col d-flex justify-content-end align-items-center gap-3 profile-match-actions">
                                            <Link to={`/match/${match.match_id}`} className="align-self-center">
                                                <button className="profile-match-open-button">Open Match</button>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="row" key={match.match_id || Math.random()}>
                            <div className="Chipcard-match profile-match-card profile-match-unavailable">
                                <div className="container p-md-1">
                                    <div className="row align-items-center g-3">
                                        <div className="col-md text-start">
                                            <p className="profile-match-label mb-1">Match Status</p>
                                            <h5 className="text-danger">match not available</h5>
                                        </div>
                                        <div className="col-md-auto d-flex justify-content-end">
                                            <button
                                                className="profile-match-download-button"
                                                onClick={() => {
                                                    fetch(`http://127.0.0.1:5110/downloadMatch/${match.match_id}`)
                                                        .then((response) => {
                                                            if (!response.ok) {
                                                                throw new Error(`Error: ${response.status}`);
                                                            }
                                                            window.location.reload();
                                                        }
                                                        )
                                                        .catch((error) => {
                                                            console.error("Download failed:", error);
                                                        });
                                                }}
                                            >
                                                Download Match
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                ))}



            </>
        );
    }
}

export default Profile;