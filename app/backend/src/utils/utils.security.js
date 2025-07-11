const bcrypt = require('bcrypt');
const validator = require('validator');

async function hash_password(password) {
    try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        return hashedPassword;

    } catch (err) {
        console.error("Error hashing password:", err);
    }
}

function gen_jwt_token(fastify, payload, expire_date)
{
    const token = fastify.jwt.sign(
        { payload },
        { expiresIn: expire_date }
    )
    return (token)
}

function check_email(email)
{
    if (!email || !validator.isEmail(email) || !validator.isLength(email, { max: 254 }))
    {
        return "invalid email address"
    }
}

function check_name(name)
{
    if (!name || !validator.isLength(name, { min: 8, max: 100 }))
    {
        return "name must be 8-100 characters long"
    }
}

function check_password(password)
{
    if (!password || !validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
    }))
    {
        return "password must be at least 8 characters with 1 lowercase, 1 uppercase, 1 number, and 1 symbol"
    }
}

function check_message(message)
{
    if (!message || message.trim().length === 0)
    {
        return "Message cannot be empty";
    }
    if (!validator.isLength(message, { min: 1, max: 1000 }))
    {
        return "Message must be between 1 and 1000 characters";
    }
}

function check_and_sanitize(data) {
    const errors = [];
    // Start with a shallow copy of all incoming data.
    const sanitized = { ...data };

    if ('name' in data) {
        const err = check_name(data.name);
        if (err) {
            errors.push(err);
            delete sanitized.name;
        } else {
            sanitized.name = validator.escape(data.name);
        }
    }

    if ('email' in data) {
        const err = check_email(data.email);
        if (err) {
            errors.push(err);
            delete sanitized.email;
        } else {
            sanitized.email = validator.normalizeEmail(data.email);
        }
    }

    if ('password' in data) {
        const err = check_password(data.password);
        if (err) {
            errors.push(err);
            delete sanitized.password;
        }
    }

    if ('message' in data) {
        const err = check_message(data.message)
        if (err) {
            errors.push(err)
            delete sanitized.message
        } else {
            sanitized.message = validator.escape(data.message)
        }
    }

    return {
        errors,
        sanitized,
        isValid: errors.length === 0
    };
}


module.exports = {
    hash_password,
    gen_jwt_token,
    check_and_sanitize,
}
