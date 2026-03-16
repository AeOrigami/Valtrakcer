import { Link } from "react-router-dom";
import './style.css'
import 'bootstrap/dist/css/bootstrap.min.css'

function PlayerNotFound() {
    return (
        <div className="align-items-center p-md-3">
            <img src="https://static.wikia.nocookie.net/valorant/images/4/44/Deep_Breath_Spray.gif/revision/latest?cb=20240308130505"
                className="error-img"
                alt="banner" />
            <h1>Player Not found</h1>
            <h3>The player you are looking for does not exist (in this database).</h3>
            <Link to="/">
                <button>Go back to Home</button>
            </Link>
        </div>
    );
};

export default PlayerNotFound;