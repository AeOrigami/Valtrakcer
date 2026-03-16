import { Link } from "react-router-dom";
import './style.css'
import 'bootstrap/dist/css/bootstrap.min.css'

function NotFoundPage() {
    return (
        <div className="align-items-center p-md-3">
            <img src="https://static.wikia.nocookie.net/valorant/images/c/c3/MEOW_Spray.gif/revision/latest?cb=20241015112958"
                className="error-img"
                alt="banner" />
            <h1>404 - Not Found</h1>
            <h3>The page you are looking for does not exist.</h3>
            <Link to="/">
                <button>Go back to Home</button>
            </Link>
        </div>
    );
};

export default NotFoundPage;