import type { Route } from "./+types/home";
import Dashboard from "../components/Dashboard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Morning Routine Dashboard" },
    { name: "description", content: "Your personalized morning routine dashboard with AI assistance" },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  // In a real app, this would fetch user data from a database
  return { 
    userName: "Kevin",
    lastUpdated: new Date().toISOString()
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <Dashboard userName={loaderData.userName} />;
}
