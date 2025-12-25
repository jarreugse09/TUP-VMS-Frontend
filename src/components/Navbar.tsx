import { Menu, Avatar, Dropdown } from "antd";
import { UserOutlined, LogoutOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const menu = (
    <Menu>
      <Menu.Item key="1" icon={<LogoutOutlined />} onClick={handleLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        height: "100%",
        background: "white",
        padding: "0 24px",
      }}
    >
      <Dropdown overlay={menu} placement="bottomRight">
        <div
          style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
        >
          <Avatar icon={<UserOutlined />} />
          <span style={{ marginLeft: "8px", color: "black" }}>
            {user ? `${user.firstName} ${user.surname}` : "User"}
          </span>
        </div>
      </Dropdown>
    </div>
  );
};

export default Navbar;
