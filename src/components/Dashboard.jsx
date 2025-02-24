import { useNavigate } from 'react-router-dom';

function Dashboard() {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token'); // ลบ token
        navigate('/'); // กลับไปหน้า Login
    };

    return (
        <div className="text-center mt-5">
            <h2>ยินดีต้อนรับสู่ Dashboard!</h2>
            <p>คุณล็อกอินสำเร็จแล้ว</p>
            <button className="btn btn-danger" onClick={handleLogout}>
                ออกจากระบบ
            </button>
        </div>
    );
}

export default Dashboard;