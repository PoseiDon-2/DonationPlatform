import { Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import Register from './components/Register';
import Login from './components/Login';
import Verify from './components/Verify';
import Dashboard from './components/Dashboard';
import Navbar from './components/Navbar';
import PendingVerification from './components/PendingVerification';
import ThankYou from './components/ThankYou';

function App() {
    return (
        <div>
            <Navbar />
            <div className="container mt-5">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/verify" element={<Verify />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/pending-verification" element={<PendingVerification />} />
                    <Route path="/thank-you" element={<ThankYou />} />
                </Routes>
            </div>
        </div>
    );
}

export default App;