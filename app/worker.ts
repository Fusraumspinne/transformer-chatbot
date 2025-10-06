import {
  AutoTokenizer,
  AutoModelForCausalLM,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "@huggingface/transformers";

class TextGenerationPipeline {
  static model_id = "onnx-community/Llama-3.2-1B-Instruct-q4f16";
  static tokenizer: any;
  static model: any;

  static async getInstance(progress_callback?: (x: any) => void) {
    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
      progress_callback,
    });

    this.model ??= AutoModelForCausalLM.from_pretrained(this.model_id, {
      dtype: "q4f16",
      device: "webgpu",
      progress_callback,
    });

    return Promise.all([this.tokenizer, this.model]);
  }
}

const stopping_criteria = new InterruptableStoppingCriteria();

async function generate(messages: any[]) {
  const [tokenizer, model] = await TextGenerationPipeline.getInstance();

  const systemPrompt = {
    role: "system",
    content: `Du bist ein präzises, kreatives und sachkundiges KI-Sprachmodell. Antworte stets klar, strukturiert, kurz gefasst und faktenbasiert. Vermeide Spekulationen und gib an, wenn Informationen fehlen oder unklar sind. Bei technischen Fragen liefere vollständige, getestete Codebeispiele und erkläre diese verständlich. Bei Bedarf bitte um Klarstellung.`,
  };

  const userMessage = messages[messages.length - 1];
  const messagesWithSystem = [systemPrompt, userMessage];

  const inputs = tokenizer.apply_chat_template(messagesWithSystem, {
    add_generation_prompt: true,
    return_dict: true,
  });

  let startTime: number | undefined;
  let numTokens = 0;
  let tps: number | undefined;

  const token_callback_function = () => {
    startTime ??= performance.now();
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000;
    }
  };

  const callback_function = (output: string) => {
    (self as any).postMessage({ status: "update", output, tps, numTokens });
  };

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
    token_callback_function,
  });

  (self as any).postMessage({ status: "start" });

  const { past_key_values, sequences } = await model.generate({
    ...inputs,
    do_sample: false,
    max_new_tokens: 1024,
    streamer,
    stopping_criteria,
    return_dict_in_generate: true,
  });

  const decoded = tokenizer.batch_decode(sequences, {
    skip_special_tokens: true,
  });

  // decoded ist ein Array; wir senden das als String (erste Sequenz) zurück.
  const outputText = Array.isArray(decoded) ? decoded[0] : String(decoded);

  (self as any).postMessage({ status: "complete", output: outputText });
}

async function check() {
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) throw new Error("WebGPU is not supported (no adapter found)");
    (self as any).postMessage({ status: "check-ok" });
  } catch (e) {
    (self as any).postMessage({
      status: "error",
      data: (e as Error).toString(),
    });
  }
}

async function load() {
  (self as any).postMessage({ status: "loading", data: "Model laden..." });
  const [tokenizer, model] = await TextGenerationPipeline.getInstance(
    (x: any) => {
      (self as any).postMessage(x);
    }
  );

  (self as any).postMessage({
    status: "loading",
    data: "Kompilieren von Shadern und Aufwärmen des Modells...",
  });
  const inputs = tokenizer("a");
  await model.generate({ ...inputs, max_new_tokens: 1 });
  (self as any).postMessage({ status: "ready" });
}

(self as any).addEventListener("message", async (e: any) => {
  const { type, data } = e.data;
  switch (type) {
    case "check":
      check();
      break;
    case "load":
      load();
      break;
    case "generate":
      stopping_criteria.reset();
      generate(data);
      break;
    case "interrupt":
      stopping_criteria.interrupt();
      break;
    case "reset":
      stopping_criteria.reset();
      break;
    default:
      break;
  }
});