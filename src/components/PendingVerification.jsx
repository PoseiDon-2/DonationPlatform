import { useEffect, useState } from 'react';
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
            console.error('No email provided in state'); // Debug
            setStatusMessage('ไม่พบอีเมล กรุณาสมัครใหม่');
            navigate('/register');
            return;
        }

        console.log('Starting polling for email:', email); // Debug
        const interval = setInterval(async () => {
            try {
                console.log('Polling for email:', email);
                const response = await axios.get(`https://donation-platform-sable.vercel.app/api/check-verification?email=${email}`);
                console.log('Check-verification response:', response.data);

                if (response.data.status === 'verified') {
                    setStatusMessage('ยินดีด้วย! อีเมลยืนยันสำเร็จ กำลังพาคุณไปหน้าเข้าสู่ระบบ...');
                    clearInterval(interval);
                    setTimeout(() => {
                        console.log('Redirecting to /login');
                        navigate('/login');
                    }, 1000);
                } else if (response.data.status === 'not_found') {
                    setStatusMessage('ไม่พบข้อมูลการสมัคร กรุณาสมัครใหม่');
                    clearInterval(interval);
                    setTimeout(() => {
                        console.log('Redirecting to /register');
                        navigate('/register');
                    }, 1000);
                } else if (response.data.status === 'pending') {
                    setStatusMessage('กรุณายืนยันอีเมลของคุณ');
                } else {
                    console.warn('Unexpected status:', response.data.status);
                    setStatusMessage('สถานะไม่ถูกต้อง กรุณารอสักครู่');
                }
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'เกิดข้อผิดพลาดในการตรวจสอบ';
                console.error('Polling error:', err.response?.data || err);
                setStatusMessage(`${errorMessage} โปรดลองใหม่`);
            }
        }, 2000);

        return () => {
            console.log('Stopping polling for email:', email); // Debug
            clearInterval(interval);
        };
    }, [email, navigate]);

    return (
        <div className="text-center">
            <h2 className="text-warning">รอการยืนยันอีเมล</h2>
            <p>อีเมล: {email || 'ไม่ระบุ'}</p>
            <p>{statusMessage}</p>
            <p>กรุณาตรวจสอบอีเมลของคุณและคลิกลิงก์ยืนยัน</p>
            <p>หากไม่ได้รับอีเมล กรุณาตรวจสอบในโฟลเดอร์สแปม หรือ <Link to="/register">สมัครใหม่</Link></p>
        </div>
    );
}

export default PendingVerification;