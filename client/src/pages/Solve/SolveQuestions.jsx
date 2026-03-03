import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';

// Current working Groq model options
const modelOptions = [
  { label: 'GPT-OSS 120B — Best Quality ⭐', value: 'openai/gpt-oss-120b' },
  { label: 'GPT-OSS 20B — Fast & Light', value: 'openai/gpt-oss-20b' },
  { label: 'LLaMA 3.3 70B — Open Source', value: 'llama-3.3-70b-versatile' },
  { label: 'LLaMA 3.1 8B — Fastest', value: 'llama-3.1-8b-instant' },
  { label: 'Llama 4 Scout 17B — New', value: 'meta-llama/llama-4-scout-17b-16e-instruct' },
  { label: 'Llama 4 Maverick 17B — New', value: 'meta-llama/llama-4-maverick-17b-128e-instruct' },
];

// ─── Markdown Renderer ───────────────────────────────────────────────────────
const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  // Render inline formatting: bold, italic, inline-code
  const renderInline = (text) => {
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
    return text;
  };

  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ──────────────────────────────────────────────────
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <div key={`code-${i}`} className="my-4 rounded-lg overflow-hidden border border-gray-700">
          {lang && (
            <div className="bg-gray-700 text-gray-300 text-xs px-4 py-1.5 font-mono tracking-wide">
              {lang}
            </div>
          )}
          <pre className="bg-gray-900 text-green-300 text-sm p-4 overflow-x-auto leading-relaxed">
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      i++; // skip closing ```
      continue;
    }

    // ── Horizontal rule ────────────────────────────────────────────────────
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      elements.push(<hr key={`hr-${i}`} className="my-6 border-t border-gray-200" />);
      i++;
      continue;
    }

    // ── Table ──────────────────────────────────────────────────────────────
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableRows.push(lines[i]);
        i++;
      }
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(2); // skip separator row
      const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim());

      elements.push(
        <div key={`table-${i}`} className="my-5 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-50">
                {parseRow(headerRow).map((cell, ci) => (
                  <th key={ci}
                    className="px-4 py-2.5 text-left font-semibold text-indigo-800 border-b border-gray-200 whitespace-nowrap"
                    dangerouslySetInnerHTML={{ __html: renderInline(cell) }}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {parseRow(row).map((cell, ci) => (
                    <td key={ci}
                      className="px-4 py-2.5 border-b border-gray-100 align-top"
                      dangerouslySetInnerHTML={{ __html: renderInline(cell) }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // ── Headings ───────────────────────────────────────────────────────────
    const h1m = line.match(/^#\s+(.+)/);
    const h2m = line.match(/^##\s+(.+)/);
    const h3m = line.match(/^###\s+(.+)/);

    if (h1m) {
      elements.push(
        <h1 key={`h1-${i}`}
          className="text-2xl font-bold text-gray-900 mt-7 mb-3 pb-2 border-b-2 border-indigo-100"
          dangerouslySetInnerHTML={{ __html: renderInline(h1m[1]) }}
        />
      );
      i++; continue;
    }
    if (h2m) {
      elements.push(
        <h2 key={`h2-${i}`}
          className="text-xl font-bold text-indigo-700 mt-6 mb-2"
          dangerouslySetInnerHTML={{ __html: renderInline(h2m[1]) }}
        />
      );
      i++; continue;
    }
    if (h3m) {
      elements.push(
        <h3 key={`h3-${i}`}
          className="text-base font-semibold text-gray-800 mt-4 mb-1"
          dangerouslySetInnerHTML={{ __html: renderInline(h3m[1]) }}
        />
      );
      i++; continue;
    }

    // ── Ordered list ───────────────────────────────────────────────────────
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-outside ml-6 my-3 space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx}
              className="text-gray-700 leading-relaxed pl-1"
              dangerouslySetInnerHTML={{ __html: renderInline(item) }}
            />
          ))}
        </ol>
      );
      continue;
    }

    // ── Unordered list ─────────────────────────────────────────────────────
    if (/^[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-outside ml-6 my-3 space-y-1.5">
          {items.map((item, idx) => (
            <li key={idx}
              className="text-gray-700 leading-relaxed pl-1"
              dangerouslySetInnerHTML={{ __html: renderInline(item) }}
            />
          ))}
        </ul>
      );
      continue;
    }

    // ── Blank line ─────────────────────────────────────────────────────────
    if (line.trim() === '') {
      i++;
      continue;
    }

    // ── Paragraph ──────────────────────────────────────────────────────────
    elements.push(
      <p key={`p-${i}`}
        className="text-gray-700 leading-7 my-2"
        dangerouslySetInnerHTML={{ __html: renderInline(line) }}
      />
    );
    i++;
  }

  return <div>{elements}</div>;
};
// ─────────────────────────────────────────────────────────────────────────────

const SolveQuestions = () => {
  const [question, setQuestion] = useState('');
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-120b');
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState('');
  const { isAuthenticated, refreshAuthHeaders } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (refreshAuthHeaders) refreshAuthHeaders();
  }, [refreshAuthHeaders]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) { setError('You are not logged in. Please log in.'); return; }
    if (!question.trim()) return;

    setIsLoading(true);
    setSolution(null);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      const response = await api.post(
        '/api/v1/question-papers/solve',
        { question, subject: 'general', model: selectedModel },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );

      if (response.data?.status === 'success') {
        setSolution(response.data.data.solution);
      } else {
        setError('Failed to get solution. Please try again.');
      }
    } catch (err) {
      console.error('Error solving question:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(err.response?.data?.message || `Failed to get solution: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const activeModelLabel = modelOptions.find(m => m.value === selectedModel)?.label || selectedModel;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Solve Questions</h1>
      <p className="text-gray-500 mb-8">Get AI-powered step-by-step answers to any academic question.</p>

      {/* ── Input card ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Enter Your Question</h2>

        {!isAuthenticated && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
            <p className="font-medium mb-1">You are not logged in.</p>
            <Link to="/login" className="text-indigo-600 hover:underline font-medium">Log in</Link>
            {' '}or{' '}
            <Link to="/register" className="text-indigo-600 hover:underline font-medium">Register</Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={5}
            disabled={!isAuthenticated}
            placeholder="Type or paste your question here…"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 placeholder-gray-400 resize-none text-sm"
          />

          {/* Model selector */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
              AI Model
            </label>
            <select
              id="model"
              value={selectedModel}
              disabled={!isAuthenticated}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              {modelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !question.trim() || !isAuthenticated}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white text-sm transition-all ${isLoading || !question.trim() || !isAuthenticated
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md'
                }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Solving…
                </>
              ) : 'Solve Question'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-base font-medium text-gray-700">Generating solution…</p>
          <p className="text-sm text-gray-400 mt-1">This may take a few seconds.</p>
        </div>
      )}

      {/* ── Solution card ── */}
      {solution && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center gap-3 px-6 py-4 bg-indigo-50 border-b border-indigo-100">
            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-full">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-900">Solution</p>
              <p className="text-xs text-indigo-500">Generated by {activeModelLabel}</p>
            </div>
          </div>

          {/* Rendered markdown */}
          <div className="px-6 py-6">
            {/* Inline code style scoped with a class */}
            <style>{`
              .md-inline-code {
                background: #f1f5f9;
                color: #0f172a;
                padding: 1px 6px;
                border-radius: 4px;
                font-family: ui-monospace, SFMono-Regular, monospace;
                font-size: 0.85em;
                border: 1px solid #e2e8f0;
              }
            `}</style>
            <MarkdownRenderer content={solution} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SolveQuestions;
