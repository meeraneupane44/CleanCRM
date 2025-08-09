import React, { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./components/home";
import Scheduler from "./components/Scheduler";
import Clients from "./components/clients.tsx";
//import Cleaners from "./components/cleaners"; 
//import Clients from "./components/clients";
//import Settings from "./components/settings";
import Sidebar from "./components/layout/Sidebar";
import Cleaners from "./components/cleaners";
import SignupForm from "@/components/SignupForm";
import SignInForm from "@/components/SignInForm";

const App = () => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 overflow-auto p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/scheduler" element={<Scheduler />} />
            <Route path="/cleaners" element={<Cleaners />} />  
            <Route path="/clients" element={<Clients />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/login" element={<SignInForm />} />
            {/* <Route path="/settings" element={<Settings />} />  */}
          </Routes>
        </div>
      </div>
    </Suspense>
  );
};

export default App;
