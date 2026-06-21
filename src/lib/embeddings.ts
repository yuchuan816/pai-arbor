import { embed } from 'ai';
import type { EmbeddingFunction } from 'chromadb';
import { ollamaProvider } from '@/lib/ollama.provider';

export interface OllamaEmbeddingConfig {
  model: string;
}

export class OllamaEmbeddingFunction implements EmbeddingFunction {
  // 必须声明 name 属性
  public readonly name = 'ollama-embedding-function';
  private readonly modelName: string;

  constructor(args: { model: string }) {
    this.modelName = args.model;
  }

  // 核心的生成向量方法
  async generate(texts: string[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      texts.map(async (text) => {
        const { embedding } = await embed({
          model: ollamaProvider.embedding(this.modelName),
          value: text,
        });
        return embedding;
      }),
    );
    return embeddings;
  }

  // 获取配置，用于 Chroma 内部注册登记
  getConfig(): OllamaEmbeddingConfig {
    return {
      model: this.modelName,
    };
  }

  // 校验配置更新（如无特殊逻辑直接留空或抛错）
  validateConfigUpdate(config: Record<string, any>) {
    if ('model' in config) {
      throw new Error('Model cannot be updated');
    }
  }

  // 静态构建工厂，Chroma 内部反序列化时会调用
  static buildFromConfig(config: OllamaEmbeddingConfig): OllamaEmbeddingFunction {
    return new OllamaEmbeddingFunction(config);
  }
}
