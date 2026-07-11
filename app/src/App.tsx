import { Routes, Route } from "react-router-dom";
import Home from "./site/Home";
import About from "./site/About";
import Business from "./site/Business";
import Global from "./site/Global";
import Contact from "./site/Contact";
import PortalApp from "./portal/PortalApp";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/business" element={<Business />} />
      <Route path="/global" element={<Global />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/portal/*" element={<PortalApp />} />
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
