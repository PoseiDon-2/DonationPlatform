import { Link } from 'react-router-dom';

function ThankYou() {
    return (
        <div className="text-center">
            <h2 className="text-success">ขอบคุณที่สมัครสมาชิก!</h2>
            <p>การยืนยันของคุณสำเร็จแล้ว กรุณากลับไปล็อกอินที่เครื่องหลัก</p>
            <Link to="/login" className="btn btn-primary mt-3">ไปที่หน้าเข้าสู่ระบบ</Link>
        </div>
    );
}

export default ThankYou;