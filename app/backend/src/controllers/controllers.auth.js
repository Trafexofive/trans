
const RefreshtokenModel = require('../models/models.refresh_tokens')
const UserModel = require('../models/models.users')
const TwofaModel = require('../models/models.two_fa')
const bcrypt = require('bcrypt')
const qrcode = require('qrcode')
const speakeasy = require('speakeasy')
const { gen_jwt_token } = require('../utils/utils.security')
const { check_and_sanitize } = require("../utils/utils.security");
require('dotenv').config()

const AuthCtl = {

    async Login (request, reply)
    {
        rawUserData = request.body
        const { errors, sanitized, isValid } = check_and_sanitize(rawUserData);

        if (!isValid)
        {
            return reply.status(400).send({
                success: false,
                code: 400,
                result: errors.join(", ")
            })
        }

        const res = await UserModel.user_fetch_by_email(this.db, sanitized.email)
        
        if (res.success === false)
        {
            return reply.status(401).send({ success: false, code: 401, result: "Invalid email or password." });
        }
        const user = res.result
        const is_valid = await bcrypt.compare(sanitized.password, user.password)
        if (is_valid === false)
        {
            return reply.status(401).send({
                success: false,
                code: 401,
                result: "Invalid email or password."
            });
        }
        //----------------------------------

        //------- check if 2fa is activated:
        const check_two_fa = await TwofaModel.two_fa_get_by_id(this.db, user.id)
        if (check_two_fa.success && check_two_fa.result.verified)
        {
            const preAuthTokenPayload = { id: user.id, name: user.name, email: user.email, pre_auth: true };
            const pre_auth_token = gen_jwt_token(this, preAuthTokenPayload, '5m');
            return reply.status(202).send({
                success: true,
                code: 202,
                result: "2fa token required",
                pre_auth_token: pre_auth_token
            })
        }
        //---------------------------

        //-----------normal login:
        const access_token = gen_jwt_token(this, res.result, process.env.ACCESS_TOKEN_EXPIRE);
        const refresh_token = gen_jwt_token(this, res.result, process.env.REFRESH_TOKEN_EXPIRE);
        const create_token = await RefreshtokenModel.refresh_tokens_create(this.db, res.result.id, refresh_token);
        
        if (!create_token.success) {
            return reply.status(500).send(create_token);
        }

        reply.status(200).send({
            success: true,
            code: 200,
            result: {
                access_token: access_token,
                refresh_token: refresh_token
            }
        });
        //-----------------------
    },

    async Refresh(request, reply)
    {
        const { refresh_token } = request.body
        const payload = request.user.payload

        const res = await RefreshtokenModel.refresh_tokens_check_by_token(this.db, payload.id, refresh_token)

        if (!res.success)
        {
            return reply.status(res.code).send(res)
        }

        const new_access_token = gen_jwt_token(this, payload, process.env.ACCESS_TOKEN_EXPIRE)

        reply.status(res.code).send({
            success: true,
            code: 200,
            result: new_access_token
        })
    },

    // changed logout from deleting all refresh tokens to one refresh token
    async Logout(request, reply)
    {
        const { refresh_token } = request.body;
        // No need to verify the JWT here. If the token is invalid, the delete will just fail.
        const res = await RefreshtokenModel.refresh_tokens_delete_by_token(this.db, refresh_token);
        
        reply.status(res.code).send(res);
    },

    async TwofaCreate(request, reply)
    {
        const payload = request.user.payload

       const check_exist = await TwofaModel.two_fa_get_by_id(this.db, payload.id)
       if (check_exist.success === true)
        {
            return reply.status(409).send({
                success: false,
                code: 409,
                result: "2FA secret already exist for this user"
            })
        }

        if (check_exist.success === false && check_exist.code !== 404)
        {
            return reply.status(check_exist.code).send(check_exist)
        }

        const secret = speakeasy.generateSecret({
            name: payload.name,
            email: payload.email
        })

        const store_secret =  await TwofaModel.two_fa_create(this.db, payload.id, secret)
        if (store_secret.success === false)    
        {
            return reply.status(store_secret.code).send(store_secret)
        }
        
        reply.status(200).send({
            success: true,
            code: 200,
            result: secret,
        })
    },

    async TwofaGet(request, reply)
    {
        const payload = request.user.payload
        const res = await TwofaModel.two_fa_get_by_id(this.db, payload.id)
        if (res.success === false)
            return reply.status(res.code).send(res)
        const qr_code = await qrcode.toDataURL(res.result.otpauth_url)
        reply.status(200).send(qr_code) // wrap this into an img take source in html
    },

    async TwofaDelete(request, reply)
    {
        const payload = request.user.payload
        const res = await TwofaModel.two_fa_delete_by_id(this.db, payload.id)
        reply.status(res.code).send(res)
    },

    async TwofaVerify(request, reply)
    {
        const payload = request.user.payload
        const { token } = request.body
        const res = await TwofaModel.two_fa_get_by_id(this.db, payload.id)
        if (res.success === false)
            return reply.status(res.code).send(res)

        const verified = speakeasy.totp.verify({
            secret: res.result.ascii,
            encoding: 'ascii',
            token: token,
            window: 1, // for the current and the past 1 code
        })

        if (verified)
        {
            const update = await TwofaModel.two_fa_verify_by_id(this.db, payload.id)
            if (update.success === false)
                return reply.status(update.code).send(update)

            return reply.status(200).send({
                success: true,
                code: 200,
                result: "2FA verified successfuly"
            })

        }
        reply.status(400).send({
            success: false,
            code: 400,
            result: "invalid 2FA token"
        })
    },

    async Login2faVerify(request, reply) {
        const user = request.user.payload
        // 6 numbers token
        const { two_fa_token } = request.body

        // First, double-check this is a pre-auth token in auth header
        if (!user.pre_auth) {
            return reply.status(401).send({ success: false, code: 401, result: "Invalid token type" })
        }

        // Now, verify the 2FA code, just like in TwofaVerify
        const twoFaResult = await TwofaModel.two_fa_get_by_id(this.db, user.id)
        if (!twoFaResult.success) {
            return reply.status(401).send({ success: false, code: 401, result: "2FA is not set up correctly" })
        }

        const verified = speakeasy.totp.verify({
            secret: twoFaResult.result.ascii,
            encoding: 'ascii',
            token: two_fa_token,
            window: 1,
        });

        if (verified) {
            // 2FA code is correct! Now we can complete the login.
            // Generate the FINAL access and refresh tokens.
            const user_payload = { id: user.id, name: user.name, email: user.email };
            const access_token = gen_jwt_token(this, user_payload, process.env.ACCESS_TOKEN_EXPIRE);
            const refresh_token = gen_jwt_token(this, user_payload, process.env.REFRESH_TOKEN_EXPIRE);
            await RefreshtokenModel.refresh_tokens_create(this.db, user.id, refresh_token);
            
            return reply.status(200).send({
                success: true,
                code: 200,
                result: { access_token, refresh_token }
            });
        }

        // If we reach here, the 2FA code was wrong.
        return reply.status(401).send({
            success: false,
            code: 401,
            result: "Invalid 2FA token"
        });
    }
}

module.exports = AuthCtl
