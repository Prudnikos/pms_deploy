import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/components/auth/AuthProvider';
import LoginForm from '@/components/auth/LoginForm'; // Импортируем нашу форму входа
import Layout from "./Layout.jsx";
import ChannexIntegration from "./ChannexIntegration";

// Импорты твоих страниц
import Dashboard from "./Dashboard";
import Bookings from "./Bookings";
import CheckIns from "./CheckIns";
import CheckOuts from "./CheckOuts";
import Unpaid from "./Unpaid";
import Chat from "./Chat";
import Integrations from "./Integrations";

// Импорты новых страниц для статистики
import Arrivals from "./Arrivals";
import Departures from "./Departures";
import Stays from "./Stays";
import Birthdays from "./Birthdays";
import Tasks from "./Tasks";

const PAGES = {
    Dashboard: Dashboard,
    Bookings: Bookings,
    CheckIns: CheckIns,
    CheckOuts: CheckOuts,
    Unpaid: Unpaid,
    Chat: Chat,
    Integrations: Integrations,
    ChannexIntegration: ChannexIntegration,
    // Новые страницы статистики
    Arrivals: Arrivals,
    Departures: Departures,
    Stays: Stays,
    Birthdays: Birthdays,
    Tasks: Tasks
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }
    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Этот компонент теперь отвечает за логику "что показать"
function AppRoutes() {
    const { user, loading } = useAuth(); // Получаем статус пользователя из нашего нового провайдера
    const location = useLocation();
    
    // Пока идёт проверка, ничего не показываем
    if (loading) {
        return <div>Загрузка...</div>; // Или твой компонент-загрузчик
    }

    // Если пользователя нет, показываем форму входа
    if (!user) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f0f2f5' }}>
                <LoginForm />
            </div>
        );
    }

    // Если пользователь есть, показываем основное приложение
    const currentPage = _getCurrentPage(location.pathname);
    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/Dashboard" element={<Dashboard />} />
                <Route path="/Bookings" element={<Bookings />} />
                <Route path="/CheckIns" element={<CheckIns />} />
                <Route path="/CheckOuts" element={<CheckOuts />} />
                <Route path="/Unpaid" element={<Unpaid />} />
                <Route path="/Chat" element={<Chat />} />
                <Route path="/Integrations" element={<Integrations />} />
                <Route path="/ChannexIntegration" element={<ChannexIntegration />} />
                
                {/* Новые роуты для страниц статистики */}
                <Route path="/Arrivals" element={<Arrivals />} />
                <Route path="/Departures" element={<Departures />} />
                <Route path="/Stays" element={<Stays />} />
                <Route path="/Birthdays" element={<Birthdays />} />
                <Route path="/Tasks" element={<Tasks />} />
            </Routes>
        </Layout>
    );
}

// Главный экспорт. Оборачиваем всё в Router и наш SupabaseAuthProvider
export default function Pages() {
    return (
        <AuthProvider>
            <Router>
                <AppRoutes />
            </Router>
        </AuthProvider>
    );
}