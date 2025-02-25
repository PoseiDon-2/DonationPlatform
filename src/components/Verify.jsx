import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Verify() {
    const [searchParams] = useSearchParams();
    const [message, setMessage] = useState('กำลังยืนยัน...');
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const redirect = searchParams.get('redirect') || '/thank-you';

        if (token) {
            console.log('Verifying token:', token, 'Redirect to:', redirect); // Debug
            axios.get(`https://donation-platform-sable.vercel.app/verify?token=${token}`)
                .then(response => {
                    console.log('Verify response:', response.data); // Debug
                    setMessage(response.data.message);
                    if (response.data.status === 'OK') {
                        console.log('Verification successful, redirecting to:', redirect);
                        setTimeout(() => {
                            navigate(redirect);
                        }, 2000);
                    } else {
                        console.warn('Unexpected verify status:', response.data.status);
                    }
                })
                .catch(err => {
                    const errorMessage = err.response?.data?.message || 'เกิดข้อผิดพลาดในการยืนยัน';
                    console.error('Verify error:', err.response?.data || err); // Debug
                    setMessage(errorMessage);
                });
        } else {
            console.error('No token provided in URL'); // Debug
            setMessage('ไม่มี token ในการยืนยัน');
        }
    }, [searchParams, navigate]);

    return (
        <div className="text-center">
            <h2>{message.includes('สำเร็จ') ? 'ยินดีด้วย!' : 'เกิดข้อผิดพลาด'}</h2>
            <p>{message}</p>
            {message.includes('สำเร็จ') && <p>กำลังพาคุณไปหน้าที่กำหนด...</p>}
            {message.includes('ข้อผิดพลาด') && (
                <p>กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ</p>
            )}
        </div>
    );
}

export default Verify;