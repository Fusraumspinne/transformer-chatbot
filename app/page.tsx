"use client";

import React, { useEffect, useRef, useState } from "react";
import Chat from "@/components/Chat";
import Progress from "@/components/Progress";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";

type Message = { role: "user" | "assistant"; content: string };

const STICKY_SCROLL_THRESHOLD = 120;
const EXAMPLES = [
  "Beschreibe mir ein futuristisches Auto, das fliegen kann und autonom fährt.",
  "Erstelle ein kreatives Rezept für ein veganes Dessert mit Schokolade und Beeren.",
  "Schreibe ein kurzes Dialog-Szenario zwischen einem Detektiv und einem Zeugen in einem Krimi.",
  "Erkläre, wie ein Schwarzes Loch entsteht, auf einfache Weise für ein Kind.",
  "Generiere eine kleine Text-basierte Rätselaufgabe, bei der man eine Zahl zwischen 1 und 100 erraten muss.",
];

export default function Page() {
  const [isWebGPUAvailable, setIsWebGPUAvailable] = useState(true);
  const worker = useRef<Worker | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [tps, setTps] = useState<number | null>(null);
  const [numTokens, setNumTokens] = useState<number | null>(null);

  function onEnter(message: string) {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setTps(null);
    setIsRunning(true);
    setInput("");
  }

  function onInterrupt() {
    if (!worker.current) return;
    worker.current.postMessage({ type: "interrupt" });
    setIsRunning(false);
  }

  useEffect(() => {
    resizeInput();
  }, [input]);

  function resizeInput() {
    if (!textareaRef.current) return;
    const target = textareaRef.current;
    target.style.height = "auto";
    const newHeight = Math.min(Math.max(target.scrollHeight, 24), 200);
    target.style.height = `${newHeight}px`;
  }

  useEffect(() => {
    if (!worker.current && typeof window !== "undefined") {
      worker.current = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current.postMessage({ type: "check" });
    }

    const onMessageReceived = (e: MessageEvent) => {
      const d = e.data || {};
      switch (d.status) {
        case "loading":
          setStatus("loading");
          setLoadingMessage(d.data || "");
          break;
        case "initiate":
          setProgressItems((prev) => [...prev, d]);
          break;
        case "progress":
          setProgressItems((prev) =>
            prev.map((item) =>
              item.file === d.file ? { ...item, ...d } : item
            )
          );
          break;
        case "done":
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== d.file)
          );
          break;
        case "ready":
          setStatus("ready");
          break;
        case "start":
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
          break;
        case "update": {
          const { output, tps, numTokens } = d;
          setTps(tps ?? null);
          setNumTokens(numTokens ?? null);
          setMessages((prev) => {
            const cloned = [...prev];
            const last = cloned.at(-1);
            if (!last) return cloned;
            cloned[cloned.length - 1] = {
              ...last,
              content: last.content + output,
            };
            return cloned;
          });
          break;
        }
        case "complete":
          setIsRunning(false);
          break;
        case "error":
          setError(d.data?.toString() || String(d));
          setStatus(null);
          setIsRunning(false);
          break;
        case "check-ok":
          // optional: set a flag if needed
          break;
        default:
          break;
      }
    };

    const onErrorReceived = (e: Event) => {
      console.error("Worker error:", e);
      setError("Worker error - siehe Konsole");
    };

    if (worker.current) {
      worker.current.addEventListener("message", onMessageReceived);
      worker.current.addEventListener("error", onErrorReceived as any);
    }

    setIsWebGPUAvailable(!!(navigator as any).gpu);

    return () => {
      if (worker.current) {
        worker.current.removeEventListener("message", onMessageReceived);
        worker.current.removeEventListener("error", onErrorReceived as any);
      }
    };
  }, []);

  useEffect(() => {
    if (messages.filter((x) => x.role === "user").length === 0) return;
    if (messages.at(-1)?.role === "assistant") return;
    setTps(null);
    worker.current?.postMessage({ type: "generate", data: messages });
  }, [messages, isRunning]);

  useEffect(() => {
    if (!chatContainerRef.current || !isRunning) return;
    const element = chatContainerRef.current;
    if (
      element.scrollHeight - element.scrollTop - element.clientHeight <
      STICKY_SCROLL_THRESHOLD
    ) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, isRunning]);

  if (!isWebGPUAvailable) {
    return (
      <div className="fixed w-screen h-screen bg-gray-900 z-10 text-gray-200 text-2xl font-semibold flex justify-center items-center text-center">
        WebGPU is not supported
        <br />
        by this browser :(
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen mx-auto items justify-end text-gray-200 bg-gray-900">
      {status === null && messages.length === 0 && (
        <div className="h-full overflow-auto scrollbar-thin flex justify-center items-center flex-col relative">
          <div className="flex flex-col items-center mb-1 max-w-[340px] text-center">
            <h1 className="text-4xl font-bold mb-1">Llama-3.2 WebGPU</h1>
            <h2 className="font-semibold">
              Ein privater und leistungsstarker KI-Chatbot, <br />
              der lokal in Ihrem Browser ausgeführt wird
            </h2>
          </div>

          <div className="flex flex-col items-center px-4">
            <p className="max-w-[514px] mb-4">
              <br />
              Du bist dabei{" "}
              <a
                href="https://huggingface.co/onnx-community/Llama-3.2-1B-Instruct-q4f16"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline"
              >
                Llama-3.2-1B-Instruct
              </a>
              , ein 1.24 Milliarden Parameter LLM das für den Browser optimiert
              ist, zu laden. Nach dem Download wird das Modell (1,15 GB)
              zwischengespeichert und beim erneuten Besuch der Seite
              wiederverwendet
            </p>

            {error && (
              <div className="text-red-500 text-center mb-2">
                <p className="mb-1">
                  Nicht möglich das Model zu laden durch folgenden Fehler::
                </p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <button
              className="border border-blue-950 px-4 py-2 rounded-4xl bg-gray-900 text-gray-200 hover:bg-blue-950 disabled:cursor-not-allowed select-none"
              onClick={() => {
                worker.current?.postMessage({ type: "load" });
                setStatus("loading");
              }}
              disabled={status !== null || error !== null}
            >
              Model laden
            </button>
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="w-full max-w-[500px] text-left mx-auto p-4 bottom-0 mt-auto">
          <p className="text-center mb-1">{loadingMessage}</p>
          {progressItems.map(({ file, progress, total }, i) => (
            <Progress key={i} text={file} percentage={progress} total={total}/>
          ))}
        </div>
      )}

      {status === "ready" && (
        <div
          ref={chatContainerRef}
          className="overflow-y-auto scrollbar-thin w-full flex flex-col items-center h-full"
        >
          <Chat messages={messages} />
          {messages.length === 0 && (
            <div>
              {EXAMPLES.map((msg, i) => (
                <div
                  key={i}
                  className="m-1 border border-blue-950 rounded-4xl py-3 px-4 bg-gray-900 cursor-pointer"
                  onClick={() => onEnter(msg)}
                >
                  {msg}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="text-center text-sm min-h-8 text-gray-200 flex items-center justify-center pt-1">
        {tps && messages.length > 0 && (
          <>
            {!isRunning && (
              <span>
                Generierte {numTokens} Tokens in {(numTokens! / tps).toFixed(2)}{" "}
                Sekunden&nbsp;&#40;
              </span>
            )}
            <>
              <span className="font-medium text-center mr-1 text-gray-200">
                {tps.toFixed(2)}
              </span>
              <span className="text-gray-200">
                Tokens/Sekunde
              </span>
            </>
            {!isRunning && (
              <>
                <span className="mr-1">&#41;</span>
                <span
                  className="underline cursor-pointer"
                  onClick={() => {
                    worker.current?.postMessage({ type: "reset" });
                    setMessages([]);
                  }}
                >
                  zurücksetzten
                </span>
              </>
            )}
          </>
        )}
      </div>

      <div className="mt-2 border border-blue-950 bg-gray-900 rounded-4xl w-[600px] max-w-[80%] max-h-[200px] mx-auto relative mb-3 flex">
        <textarea
          ref={textareaRef}
          className="scrollbar-thin w-[550px] bg-gray-900 px-5 py-4 rounded-4xl border-none outline-none text-gray-200 placeholder-gray-400 resize-none disabled:cursor-not-allowed"
          placeholder="Gebe eine Naricht ein..."
          rows={1}
          value={input}
          disabled={status !== "ready"}
          title={
            status === "ready" ? "Model ist bereit" : "Model noch nicht geladen"
          }
          onKeyDown={(e) => {
            if (
              input.length > 0 &&
              !isRunning &&
              e.key === "Enter" &&
              !e.shiftKey
            ) {
              e.preventDefault();
              onEnter(input);
            }
          }}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
        />

        {isRunning ? (
          <div
            className="cursor-pointer flex items-center"
            onClick={onInterrupt}
          >
            <CloseIcon style={{ fontSize: 30 }} />
          </div>
        ) : input.length > 0 ? (
          <div
            className="cursor-pointer flex items-center justify-center"
            onClick={() => onEnter(input)}
          >
            <SendIcon style={{ fontSize: 30 }} />
          </div>
        ) : (
          <div className="flex items-center justify-center cursor-not-allowed">
            <SendIcon style={{ fontSize: 30 }} />
          </div>
        )}
      </div>
    </div>
  );
}