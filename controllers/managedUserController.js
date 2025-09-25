import User from '../models/userModel.js';
import bcrypt from 'bcryptjs';

export const createManagedUser = async (req, res) => {
    const { users } = req.body;
    const { id: currentUserId } = req.user;

    console.log(currentUserId);

    const user = await User.findById(currentUserId)
    console.log("adminUser",user);
    try {

        if (["admin", "manager"].includes(user.role)) {
            console.log(users, "users");
        } else {
            return res.status(403).json({ message: "Unauthorized: Only admins and managers can create users." });
        }
        
        for (const newUser of users) {
            const { username, email, password, role,companyId } = newUser;

            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: `User with email ${email} already exists.` });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const managedUser = new User({
                username,
                email,
                password: hashedPassword,
                role,
                companyId
            });

            await managedUser.save();
            console.log(`User created: ${username}`);
        }

        return res.status(201).json({ message: "Managed users created successfully."});
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: "Server error while creating user."});
    }
};

export const updateManagedUser = async (req, res) => {
    const { id: currentUserId, role: currentUserRole, companyId: currentUserCompanyId } = req.user;
    const { username, email, password, role } = req.body;
  
    try {
      if (currentUserRole !== "admin") {
        return res.status(403).json({ message: "Unauthorized: Only admins can update users." });
      }
  
      if (currentUserId === req.params.id) {
        return res.status(400).json({ message: "Admins cannot update their own data." });
      }
  
      const existingUser = await User.findById(req.params.id);
      // if (!existingUser) {
      //   return res.status(404).json({ message: `User with ID ${req.params.id} not found.` });
      // }
  
      if (existingUser.role === "admin") {
        return res.status(403).json({ message: "Admins cannot update other admins." });
      }
  
      if (existingUser.companyId.toString() !== currentUserCompanyId.toString()) {
        return res.status(403).json({ message: "Unauthorized: You can only update users within your company." });
      }
  
      const updatedData = {
        ...(username && { username }),
        ...(email && { email }),
        ...(role && { role }),
      };
  
      if (password) {
        updatedData.password = await bcrypt.hash(password, 10);
      }
  
      const result = await User.findByIdAndUpdate(req.params.id, updatedData, { new: true });
  
      console.log(`User updated: ${result.username}`);
      return res.status(200).json({ message: "User updated successfully.", result });
  
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Server error while updating user." });
    }
};
  

export const deleteManagedUser = async (req, res) => {
    const { id: currentUserId } = req.user;
    const { id: deleteUserId } = req.params;

    try {
        const currentUser = await User.findById(currentUserId);
        if (currentUser.role !== "admin") {
            return res.status(403).json({ message: "Unauthorized: Only admins can delete users." });
        }

        const userToDelete = await User.findById(deleteUserId);
        if (deleteUserId === currentUserId) {
            return res.status(403).json({ message: "Admins cannot delete themselves." });
        }

        if (!userToDelete) {
            return res.status(404).json({ message: `User with ID ${deleteUserId} not found.` });
        }

        await User.findByIdAndDelete(deleteUserId);
        return res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: "Server error while deleting user." });
    }
};

export const getAllManagedUsers = async (req, res) => {
    try {
      const { id: currentUserId, companyId, role } = req.user;
  
      if (!currentUserId || !companyId) {
        return res.status(401).json({ status: false, message: "Unauthorized: Invalid token data." });
      }
  
      const allUsers = await User.find({ companyId }).select('-password');
  
      if (!allUsers.length) {
        return res.status(404).json({ status: false, message: "No users found." });
      }
  
      const roleOrder = { admin: 1, manager: 2, employee: 3, guest: 4 };
      allUsers.sort((a, b) => (roleOrder[a.role] || 5) - (roleOrder[b.role] || 5));
  
      let assignByUsers = [];
      let assignToUsers = [];
  
      if (['admin', 'manager'].includes(role)) {
        assignByUsers = allUsers.filter(user => ['admin', 'manager'].includes(user.role));
        assignToUsers = allUsers.filter(user => ['employee', 'guest'].includes(user.role));
      } else if (['employee', 'guest'].includes(role)) {
        assignToUsers = allUsers.filter(user => user._id.toString() === currentUserId);
      }
  
      const loggedInUser = allUsers.find(user => user._id.toString() === currentUserId);
      if (loggedInUser) {
        if (['admin', 'manager'].includes(loggedInUser.role)) {
          assignByUsers.push(loggedInUser);
        } else if (['employee', 'guest'].includes(loggedInUser.role)) {
          assignToUsers.push(loggedInUser);
        }
      }
  
      return res.status(200).json({ 
        status: true, 
        message: "Users fetched successfully", 
        allUsers,
        assignByUsers, 
        assignToUsers 
      });
  
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ status: false, message: "Server error while fetching users." });
    }
};

export const getSingleManagedUser = async (req, res) => {
    const { id: currentUserId } = req.user;
    const { id: userId } = req.params;

    try {
        if (!currentUserId) {
            return res.status(401).json({ status: false, message: "Unauthorized: Invalid token data." });
        }

        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ status: false, message: `User with ID ${userId} not found.` });
        }

        return res.status(200).json({ status: true, message: "User fetched successfully", user });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ status: false, message: "Server error while fetching user." });
    }
};


   