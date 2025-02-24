import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Navbar() {
    const { isLoggedIn, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(); // เรียกจาก context
        navigate('/');
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <div className="container">
                <Link className="navbar-brand" to="/">My App</Link>
                <div className="collapse navbar-collapse">
                    <ul className="navbar-nav ms-auto">
                        {isLoggedIn ? (
                            <li className="nav-item">
                                <button className="btn btn-danger" onClick={handleLogout}>
                                    ออกจากระบบ
                                </button>
                            </li>
                        ) : (
                            <>
                                <li className="nav-item">
                                    <Link className="btn btn-outline-primary mx-2" to="/login">
                                        ล็อกอิน
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="btn btn-outline-success" to="/register">
                                        สมัครสมาชิก
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;