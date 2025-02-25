import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Login() {
    const { login } = useContext(AuthContext);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('https://donation-platform-sable.vercel.app/login', formData);
            if (response.data.status === 'OK') {
                login(response.data.token); // ใช้ login จาก context
                setMessage('ล็อกอินสำเร็จ! รอสักครู่...');
                setTimeout(() => navigate('/dashboard'), 1000);
            } else {
                setMessage(response.data.message);
            }
        } catch (err) {
            setMessage(err.response?.data.message || 'เกิดข้อผิดพลาด');
        }
    };

    return (
        <div className="w-50 mx-auto">
            <h2 className="text-center mb-4">ล็อกอิน</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="email" className="form-label">อีเมล</label>
                    <input
                        type="email"
                        className="form-control"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">รหัสผ่าน</label>
                    <input
                        type="password"
                        className="form-control"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary w-100">ล็อกอิน</button>
            </form>
            {message && (
                <div className={`alert ${message.includes('สำเร็จ') ? 'alert-success' : 'alert-danger'} mt-3`}>
                    {message}
                </div>
            )}
            <p className="text-center mt-2">
                ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
            </p>
        </div>
    );
}

export default Login;