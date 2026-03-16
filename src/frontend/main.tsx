import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css'
import { createBrowserRouter , RouterProvider} from 'react-router-dom'
import Gamepage from './game.tsx'
import App from './App.tsx'
import Match from './Match.tsx'
import NotFoundPage from './NotFoundPage.tsx'
import Profile from './profile.tsx'
import PlayerNotFound from './PlayerNotFound.tsx';
import Leaderboard from './leaderboard.tsx';



const router = createBrowserRouter([
  {path: '/', element: <App />},
  {path: '/homepage', element: <h2>homePage</h2>},
  {path: '/profile/:username', element: <Profile />},
  {path: '/profile/:username/:game', element: <Gamepage />},
  {path: '/match/:matchId', element: <Match />},
  {path: '/leaderboard', element: <Leaderboard />},
  {path: '/profile/notfound', element: <PlayerNotFound />},
  {path: '*', element: <NotFoundPage />},
  ]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
