import Home from "@/components/home";
import Scheduler from "@/components/Scheduler";
import Cleaners from "@/components/cleaners";   
import Clients from "@/components/clients";
import SignupForm from "@/components/SignupForm";
import SignInForm from "@/components/SignInForm";
// import other pages like Cleaners, Clients, etc. when available

const routes = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/scheduler",
    element: <Scheduler />,
  },
  {
    path: "/cleaners",
    element: <Cleaners />,
  },
  { 
    path: "/clients", 
    element: <Clients /> 
  },
  {
    path: "/login",
    element: <SignInForm />
  },
  {
    path: "/signup",
    element: <SignupForm />
}
];

export default routes;
