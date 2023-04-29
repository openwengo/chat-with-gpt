import bcrypt from 'bcrypt';
import crypto from 'crypto';
import passport from 'passport';
import session from 'express-session';
import createSQLiteSessionStore from 'connect-sqlite3';
import { Strategy as LocalStrategy } from 'passport-local';
import ChatServer from './index';
import { config } from './config';

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const secret = config.authSecret;

function generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let result = '';
  
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
  
    return result;
  }

export function configurePassport(context: ChatServer) {
    const SQLiteStore = createSQLiteSessionStore(session);
    const sessionStore = new SQLiteStore({ db: 'sessions.db' });

    /*    
    passport.use(new LocalStrategy(async (email: string, password: string, cb: any) => {
        const user = await context.database.getUser(email);

        if (!user) {
            return cb(null, false, { message: 'Incorrect username or password.' });
        }

        try {
            const isPasswordCorrect = user.salt
                ? crypto.timingSafeEqual(user.passwordHash, crypto.pbkdf2Sync(password, user.salt, 310000, 32, 'sha256'))
                : await bcrypt.compare(password, user.passwordHash.toString());

            if (!isPasswordCorrect) {
                return cb(null, false, { message: 'Incorrect username or password.' });
            }

            return cb(null, user);
        } catch (e) {
            cb(e);
        }
    }));
    */
    //
    passport.use(new GoogleStrategy({
        clientID: process.env['GOOGLE_CLIENT_ID'],
        clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
        callbackURL: '/chatapi/auth/google/callback',
        scope: [ 'profile' ]
    }, async function (accessToken: any, refreshToken: any, profile: any, cb: any) {
        console.log("verify google user: accessToken:", accessToken, "refreshToken:", refreshToken, "profile:", profile);

        const useremail = profile._json.email ;
        let user = await context.database.getUser(useremail);
        
        if (!user) {
            console.log("Create new user for email", useremail);
            await context.database.createUser(useremail, Buffer.from(generateRandomString(15)));
            let user = await context.database.getUser(useremail);
        }
        console.log("User:", user);
        return cb(null,user);
    }));   
    //
    passport.serializeUser((user: any, cb: any) => {
        process.nextTick(() => {
            cb(null, { id: user.id, username: user.username });
        });
    });

    passport.deserializeUser((user: any, cb: any) => {
        process.nextTick(() => {
            return cb(null, user);
        });
    });

    context.app.use(session({
        secret,
        resave: false,
        saveUninitialized: false,
        store: sessionStore as any,
    }));
    context.app.use(passport.authenticate('session'));

    context.app.get('/chatapi/auth/google', 
        passport.authenticate('google', { scope: ['profile','email']})
    );

    context.app.get('/chatapi/auth/google/callback',
        passport.authenticate('google', {failureRedirect: '/login'}),
        function(req, res){
            res.redirect('/');
        })
    
    /*
    context.app.post('/chatapi/login', passport.authenticate('local', {
        successRedirect: '/',
        failureRedirect: '/?error=login'
    }));
    */
   /*
    context.app.post('/chatapi/register', async (req, res, next) => {
        const { username, password } = req.body;

        const hashedPassword = await bcrypt.hash(password, 12);

        try {
            await context.database.createUser(username, Buffer.from(hashedPassword));

            passport.authenticate('local')(req, res, () => {
                res.redirect('/');
            });
        } catch (err) {
            console.error(err);
            res.redirect('/?error=register');
        }
    });
    */

    context.app.all('/chatapi/logout', (req, res, next) => {
        req.logout((err) => {
            if (err) {
                return next(err);
            }
            res.redirect('/');
        });
    });
}