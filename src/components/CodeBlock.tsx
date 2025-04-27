"use client";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import React, { useState } from "react";

interface CodeBlockProps {
  codeText: string;
  language: string;
  caption?: string;
}

// PascalCase 변환 함수
function toPascalCase(str: string) {
  return str
    ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    : "";
}

const CodeBlock = ({ codeText, language, caption }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="my-6">
      {/* 상단 바: 언어 + 복사 버튼 */}
      <div className="flex items-center justify-between px-4 py-1 rounded-t-lg bg-gray-800">
        <span className="text-xs text-gray-200 font-mono uppercase tracking-wide">
          {toPascalCase(language)}
        </span>
        <button
          type="button"
          className="opacity-80 hover:opacity-100 transition-opacity text-xs bg-gray-700 text-white px-2 py-1 rounded hover:bg-gray-600 focus:outline-none"
          title="코드 복사"
          onClick={handleCopy}
        >
          {copied ? "복사됨!" : "복사"}
        </button>
      </div>
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{ borderRadius: "0 0 0.75rem 0.75rem", fontSize: "1rem", padding: "1.25rem", margin: 0 }}
          showLineNumbers={true}
          wrapLongLines={true}
        >
          {codeText}
        </SyntaxHighlighter>
      </div>
      {caption && (
        <div className="text-xs text-gray-400 mt-2 px-2 text-center italic">
          {caption}
        </div>
      )}
    </div>
  );
};

export default CodeBlock;
