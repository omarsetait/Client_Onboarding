import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { ConfigService } from '@nestjs/config';

export interface AgentContext {
    leadId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
}

export interface AgentResult {
    success: boolean;
    action: string;
    data?: unknown;
    reasoning?: string;
    nextAgent?: string;
    error?: string;
}

export abstract class BaseAgent {
    protected llm: ChatOpenAI;
    protected agentName: string;
    protected systemPrompt: string;

    constructor(
        protected readonly configService: ConfigService,
        agentName: string,
        systemPrompt: string,
    ) {
        this.agentName = agentName;
        this.systemPrompt = systemPrompt;

        this.llm = new ChatOpenAI({
            modelName: configService.get<string>('OPENAI_MODEL', 'gpt-4'),
            openAIApiKey: configService.get<string>('OPENAI_API_KEY'),
            temperature: 0.3,
            maxTokens: 2000,
        });
    }

    abstract execute(input: unknown, context: AgentContext): Promise<AgentResult>;

    protected async chat(messages: BaseMessage[]): Promise<string> {
        const systemMessage = new SystemMessage(this.systemPrompt);
        const allMessages = [systemMessage, ...messages];

        const response = await this.llm.invoke(allMessages);
        return response.content as string;
    }

    protected async chatWithJson<T>(messages: BaseMessage[], schema?: string): Promise<T> {
        const jsonPrompt = schema
            ? `\n\nRespond ONLY with valid JSON matching this schema:\n${schema}`
            : '\n\nRespond ONLY with valid JSON.';

        const systemMessage = new SystemMessage(this.systemPrompt + jsonPrompt);
        const allMessages = [systemMessage, ...messages];

        const response = await this.llm.invoke(allMessages);
        const content = response.content as string;

        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON found in response');
        }

        return JSON.parse(jsonMatch[0]) as T;
    }

    protected createHumanMessage(content: string): HumanMessage {
        return new HumanMessage(content);
    }

    protected createAIMessage(content: string): AIMessage {
        return new AIMessage(content);
    }

    protected log(message: string, data?: unknown): void {
        console.log(`[${this.agentName}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }

    getName(): string {
        return this.agentName;
    }
}
