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
            axios.get(`http://localhost:3000/verify?token=${token}`) // เรียก backend
                .then(response => {
                    setMessage(response.data.message);
                    if (response.data.status === 'OK') {
                        setTimeout(() => {
                            navigate(redirect); // ไปตาม redirect
                        }, 2000);
                    }
                })
                .catch(err => {
                    setMessage(err.response?.data.message || 'เกิดข้อผิดพลาด');
                });
        } else {
            setMessage('ไม่มี token ในการยืนยัน');
        }
    }, [searchParams, navigate]);

    return (
        <div className="text-center">
            <h2>{message.includes('สำเร็จ') ? 'ยินดีด้วย!' : 'เกิดข้อผิดพลาด'}</h2>
            <p>{message}</p>
            {message.includes('สำเร็จ') && <p>กำลังพาคุณไปหน้าที่กำหนด...</p>}
        </div>
    );
}

export default Verify;