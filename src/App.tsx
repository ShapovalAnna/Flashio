import { Routes, Route } from "react-router";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MySetsPage from "./pages/MySetsPage";
import CreateSetPage from "./pages/CreateSetPage";
import SetPage from "./pages/SetPage";
import NotFoundPage from "./pages/NotFoundPage";
import EditSetPage from "./pages/EditSetPage";
import StudyPage from "./pages/StudyPage";
import QuizPage from "./pages/QuizPage";
import ClassesPage from "./pages/ClassesPage";
import ClassPage from "./pages/ClassPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        {/* Сторінки лише для тих, хто увійшов */}
        <Route element={<ProtectedRoute />}>
          <Route path="sets" element={<MySetsPage />} />
          <Route path="sets/new" element={<CreateSetPage />} />
          <Route path="sets/:id" element={<SetPage />} />
          <Route path="sets/:id" element={<SetPage />} />
          <Route path="sets/:id/edit" element={<EditSetPage />} />
          <Route path="sets/:id/study" element={<StudyPage />} />
          <Route path="sets/:id/quiz" element={<QuizPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="classes/:id" element={<ClassPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
