-- Create Users Table
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username NVARCHAR(50) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    email NVARCHAR(100) NOT NULL,
    name NVARCHAR(100) NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('employee', 'manager')),
    team_id INT NOT NULL
);

-- Create Teams Table
CREATE TABLE teams (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    manager_id INT
);

-- Add Foreign Key to Teams Table after both tables exist
ALTER TABLE teams
ADD CONSTRAINT FK_Teams_Manager
FOREIGN KEY (manager_id) REFERENCES users(id);

-- Add Foreign Key to Users Table for team_id
ALTER TABLE users
ADD CONSTRAINT FK_Users_Team
FOREIGN KEY (team_id) REFERENCES teams(id);

-- Create Tasks Table
CREATE TABLE tasks (
    id INT IDENTITY(1,1) PRIMARY KEY,
    description NVARCHAR(255) NOT NULL,
    priority NVARCHAR(20) NOT NULL CHECK (priority IN ('High', 'Medium', 'Low')),
    team_id INT NOT NULL,
    start_date DATE NOT NULL,
    completion_date DATE NOT NULL,
    creator_id INT NOT NULL,
    planned_labor FLOAT NOT NULL,
    actual_labor FLOAT DEFAULT 0,
    work_size INT NOT NULL CHECK (work_size BETWEEN 1 AND 5),
    roadmap NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) NOT NULL CHECK (status IN ('Not Started', 'In Progress', 'Paused', 'Completed', 'Cancelled')),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (creator_id) REFERENCES users(id)
);

-- Create Task Assignees Table (for task assignments and partners)
CREATE TABLE task_assignees (
    id INT IDENTITY(1,1) PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    role NVARCHAR(20) NOT NULL CHECK (role IN ('assignee', 'partner', 'notified')),
    planned_labor FLOAT,
    actual_labor FLOAT DEFAULT 0,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create Task History Table (for tracking changes)
CREATE TABLE task_history (
    id INT IDENTITY(1,1) PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    action NVARCHAR(50) NOT NULL,
    timestamp DATETIME NOT NULL DEFAULT GETDATE(),
    details NVARCHAR(MAX),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert sample data for teams
INSERT INTO teams (name) VALUES ('Team 1');
INSERT INTO teams (name) VALUES ('Team 2');

-- Insert sample users (password is 'password')
INSERT INTO users (username, password_hash, email, name, role, team_id)
VALUES 
('john.doe', '$2a$10$8r5EzYt.Yd5G3zOy0xRnZeW0KbO.u3QT1rGRn9J7y0V5Uq.4Uq4Uq', 'john.doe@example.com', 'John Doe', 'employee', 1),
('jane.smith', '$2a$10$8r5EzYt.Yd5G3zOy0xRnZeW0KbO.u3QT1rGRn9J7y0V5Uq.4Uq4Uq', 'jane.smith@example.com', 'Jane Smith', 'manager', 1),
('bob.johnson', '$2a$10$8r5EzYt.Yd5G3zOy0xRnZeW0KbO.u3QT1rGRn9J7y0V5Uq.4Uq4Uq', 'bob.johnson@example.com', 'Bob Johnson', 'employee', 2),
('alice.williams', '$2a$10$8r5EzYt.Yd5G3zOy0xRnZeW0KbO.u3QT1rGRn9J7y0V5Uq.4Uq4Uq', 'alice.williams@example.com', 'Alice Williams', 'manager', 2);

-- Update teams with manager IDs
UPDATE teams SET manager_id = 2 WHERE id = 1;
UPDATE teams SET manager_id = 4 WHERE id = 2;

