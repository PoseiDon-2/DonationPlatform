import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Link } from 'react-router-dom';

function PendingVerification() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const email = state?.email;
    const [statusMessage, setStatusMessage] = useState('กำลังตรวจสอบอีเมล...');

    useEffect(() => {
        if (!email) {
            setStatusMessage('ไม่พบอีเมล กรุณาสมัครใหม่');
            navigate('/register');
            return;
        }

        const interval = setInterval(async () => {
            try {
                console.log('Polling for email:', email); // Debug
                const response = await axios.get(`https://donation-platform-sable.vercel.app/api/check-verification?email=${email}`);
                console.log('Response:', response.data); // Debug

                if (response.data.status === 'verified') {
                    setStatusMessage('ยืนยันสำเร็จ! กำลังพาคุณไปหน้าเข้าสู่ระบบ...');
                    clearInterval(interval);
                    setTimeout(() => navigate('/login'), 1000);
                } else if (response.data.status === 'not_found') {
                    setStatusMessage('ไม่พบข้อมูลการสมัคร กรุณาสมัครใหม่');
                    clearInterval(interval);
                    navigate('/register');
                } else {
                    setStatusMessage('กรุณายืนยันอีเมลของคุณ');
                }
            } catch (err) {
                console.error('Polling error:', err);
                setStatusMessage('เกิดข้อผิดพลาดในการตรวจสอบ โปรดลองใหม่');
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [email, navigate]);

    return (
        <div className="text-center">
            <h2 className="text-warning">รอการยืนยันอีเมล</h2>
            <p>อีเมล: {email}</p>
            <p>{statusMessage}</p>
            <p>กรุณาตรวจสอบอีเมลของคุณและคลิกลิงก์ยืนยัน</p>
            <p>หากไม่ได้รับอีเมล กรุณาตรวจสอบในโฟลเดอร์สแปม หรือ <Link to="/register">สมัครใหม่</Link></p>
        </div>
    );
}

export default PendingVerification;