import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Link } from 'react-router-dom';

function Register() {
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:3000/register', formData);
            setMessage(response.data.message);
            setTimeout(() => {
                navigate('/pending-verification', { state: { email: formData.email } });
            }, 1000);
        } catch (err) {
            setMessage(err.response?.data.message || 'เกิดข้อผิดพลาด');
        }
    };

    return (
        <div className="w-50 mx-auto">
            <h2 className="text-center mb-4">สมัครสมาชิก</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-3">
                    <label htmlFor="name" className="form-label">ชื่อ</label>
                    <input
                        type="text"
                        className="form-control"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />
                </div>
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
                <button type="submit" className="btn btn-primary w-100">สมัคร</button>
            </form>
            {message && (
                <div className={`alert ${message.includes('สำเร็จ') ? 'alert-success' : 'alert-danger'} mt-3`}>
                    {message}
                </div>
            )}
            <p className="text-center mt-2">
                มีบัญชีแล้ว? <Link to="/login">ล็อกอิน</Link>
            </p>
        </div>
    );
}

export default Register;