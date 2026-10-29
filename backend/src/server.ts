import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import groupsRoutes from './routes/groups.routes';
import membersRoutes from './routes/members.routes';
import expensesRoutes from './routes/expenses.routes';
import balancesRoutes from './routes/balances.routes';
import settlementsRoutes from './routes/settlements.routes';
import aiRoutes from './routes/ai.routes';
import { authMiddleware } from './middleware/auth.middleware';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      /\.vercel\.app$/,
    ];
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.some(allowed => 
      typeof allowed === 'string' 
        ? allowed === origin 
        : allowed.test(origin)
    );
    callback(null, isAllowed);
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/groups', authMiddleware, groupsRoutes);
app.use('/api/groups/:groupId/members', authMiddleware, membersRoutes);
app.use('/api/groups/:groupId/expenses', authMiddleware, expensesRoutes);
app.use('/api/groups/:groupId/balances', authMiddleware, balancesRoutes);
app.use('/api/groups/:groupId/settlements', authMiddleware, settlementsRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

app.use(errorHandler);

export default app;
