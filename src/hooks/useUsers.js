import { useEffect, useState } from "react";
import { listenAllUsers } from "../services/usersService";

export function useUsers({ onlyActive = true } = {}) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsub = listenAllUsers((allUsers) => {
      const filtered = onlyActive
        ? allUsers.filter(
            (u) => !u.disabled && !u.deleted
          )
        : allUsers;

      setUsers(filtered);
    });

    return () => unsub();
  }, [onlyActive]);

  return users;
}
