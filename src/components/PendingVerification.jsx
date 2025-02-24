import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Link } from 'react-router-dom';

function PendingVerification() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const email = state?.email;

    useEffect(() => {
        if (!email) {
            navigate('/register');
            return;
        }

        const interval = setInterval(async () => {
            try {
                const response = await axios.get(`http://localhost:3000/check-verification?email=${email}`);
                if (response.data.status === 'verified') {
                    clearInterval(interval);
                    navigate('/login');
                } else if (response.data.status === 'not_found') {
                    clearInterval(interval);
                    navigate('/register');
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 2000); // เช็คทุก 2 วินาที

        return () => clearInterval(interval); // ล้าง interval เมื่อออกจากหน้า
    }, [email, navigate]);

    return (
        <div className="text-center">
            <h2 className="text-warning">รอการยืนยันอีเมล</h2>
            <p>กรุณาตรวจสอบอีเมลของคุณ ({email}) และคลิกลิงก์ยืนยัน</p>
            <p>เมื่อยืนยันสำเร็จ หน้าจะเปลี่ยนไปหน้าเข้าสู่ระบบอัตโนมัติ</p>
            <p>หากไม่ได้รับอีเมล กรุณาตรวจสอบในโฟลเดอร์สแปม หรือ <Link to="/register">สมัครใหม่</Link></p>
        </div>
    );
}

export default PendingVerification;