# Setup

init: setup MERN project with express typescript prisma

# Auth

feat(auth): implement JWT login and registration
feat(auth): add google oauth social login
fix(auth): resolve bcrypt password comparison bug

# User

feat(user): add update profile with cloudinary image upload
feat(user): implement role update by admin
fix(user): exclude password from user response

# Vehicle

feat(vehicle): add vehicle category CRUD
feat(vehicle): add vehicle type CRUD with category validation
feat(vehicle): implement vehicle creation with image upload
fix(vehicle): resolve cloudinary old image deletion on update
refactor(vehicle): simplify vehicle update service logic

# Review

feat(review): add review creation with duplicate check
feat(review): implement ownership check on update and delete
fix(review): resolve composite unique key migration error

# Booking

feat(booking): implement booking lifecycle management
feat(booking): add advance payment billing engine
fix(booking): resolve booking status transition error

# Prisma / DB

chore(prisma): add vehicle category and type models
chore(prisma): fix fuel enum migration conflict
chore(prisma): add composite unique index on review model
chore(seed): add vehicle category and type seed data

# Config

chore(config): setup cloudinary upload configuration
chore(config): add multer storage with cloudinary integration
chore(config): setup zod validation middleware
chore(env): add environment variable validation with zod
