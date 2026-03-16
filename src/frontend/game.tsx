import { Link , useParams} from 'react-router-dom';
import './style.css'

function game() {
    let params  = useParams();
    return (
        <div>
            <h1>game page: {params.game}</h1>
            <Link to={`/profile/${params.username}`}>
                <button>Go back to Home</button>
            </Link>
        </div>
    );
}

export default game;