import { Link } from 'react-router-dom';
import './AdminNavbar.css';

export default function AdminNavbar() {
  return (
    <div className="admin-navbar">
      <Link to="/picker">📋 Formuláře</Link>
      <Link to="/applicants">📝 Interní poznámky</Link>
    </div>
  );
}
