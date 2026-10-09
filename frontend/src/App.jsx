import Navbar from './components/common/Navbar.jsx';
import Footer from './components/common/Footer.jsx';
import AppRoutes from './routes.jsx';

export default function App() {
  return <div className="app-shell"><Navbar /><div className="app-main-column"><main id="main-content" className="main-content"><AppRoutes /></main><Footer /></div></div>;
}
