import { Link } from "react-router-dom";
import logo from "../../assets/images/central-horizontal.png";

export const CustomLogo = ({ className = "" }) => {
  return (
    <Link
      to="/"
      className={`flex items-center justify-center w-full ${className}`}
    >
      <img
        src={logo}
        alt="Central GPS"
        className="w-[320px] md:w-[380px] lg:w-[420px] h-auto"
      />
    </Link>
  );
};
