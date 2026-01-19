import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            log: process.env.NODE_ENV === 'development'
                ? ['query', 'info', 'warn', 'error']
                : ['error'],
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * Clean database for testing purposes
     * WARNING: Only use in test environment
     */
    async cleanDatabase() {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('cleanDatabase can only be used in test environment');
        }

        const models = Reflect.ownKeys(this).filter(
            (key) => typeof key === 'string' && !key.startsWith('_') && !key.startsWith('$'),
        );

        for (const modelKey of models) {
            const model = this[modelKey as keyof this];
            if (model && typeof model === 'object' && 'deleteMany' in model) {
                await (model as { deleteMany: () => Promise<unknown> }).deleteMany();
            }
        }
    }
}
