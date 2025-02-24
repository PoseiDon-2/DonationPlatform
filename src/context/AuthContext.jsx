// src/context/AuthContext.jsx
import { createContext, useState } from 'react';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

    const login = (token) => {
        localStorage.setItem('token', token);
        setIsLoggedIn(true); // อัปเดตสถานะทันที
    };

    const logout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false); // อัปเดตสถานะทันที
    };

    return (
        <AuthContext.Provider value={{ isLoggedIn, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}