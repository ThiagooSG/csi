import React, { useRef, useState } from "react";
import { toastService } from "../../../../services/toastService";
import "./ajustetaxa.css";

// --- Interfaces ---
interface DebitEntry {
    index: number;
    line: string;
    value: number;
}
interface CreditLine {
    index: number;
    line: string;
}
type LinesByDate = Record<string, DebitEntry[]>;
type CreditLines = Record<string, CreditLine>;

// --- Sub-Componente: Modal de Confirmação ---
const ConfirmacaoAjusteModal: React.FC<{
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ onConfirm, onCancel }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Confirmar Correção</h3>
                    <button onClick={onCancel} className="modal-close-btn">
                        &times;
                    </button>
                </div>
                <div className="confirmation-body">
                    <p>
                        Você tem certeza que deseja processar o arquivo com os novos valores
                        de crédito informados?
                    </p>
                </div>
                <div className="modal-footer">
                    <button className="ajuste-taxa-btn secondary" onClick={onCancel}>
                        Não
                    </button>
                    <button className="ajuste-taxa-btn" onClick={onConfirm}>
                        Sim, Corrigir
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Componente Principal ---
const AjusteTaxa: React.FC = () => {
    const [output, setOutput] = useState("");
    const [dates, setDates] = useState<string[]>([]);
    const [linesByDate, setLinesByDate] = useState<LinesByDate>({});
    const [creditLines, setCreditLines] = useState<CreditLines>({});
    const [creditValues, setCreditValues] = useState<Record<string, string>>({});
    const [originalFileName, setOriginalFileName] =
        useState<string>("corrigido.txt");
    const [originalLines, setOriginalLines] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [correctedContent, setCorrectedContent] = useState("");
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setOriginalFileName(file.name);
        const reader = new FileReader();
        reader.onload = function (ev) {
            const lines = (ev.target?.result as string)
                .split("\n")
                .filter((l) => l.trim());
            setOriginalLines(lines);
            const _linesByDate: LinesByDate = {};
            const _creditLines: CreditLines = {};
            lines.forEach((line, idx) => {
                const parts = line.split("|");
                if (parts.length < 8) return;
                const tipo = parts[5];
                const data = parts[6];
                if (!_linesByDate[data]) _linesByDate[data] = [];
                if (tipo === "D") {
                    const val = parseFloat((parts[7] || "0").replace(",", "."));
                    _linesByDate[data].push({ index: idx, line, value: val });
                }
                if (tipo === "C") _creditLines[data] = { index: idx, line };
            });
            const sortedDates = Object.keys(_linesByDate).sort((a, b) => {
                const [da, ma, ya] = a.split("/").map(Number);
                const [db, mb, yb] = b.split("/").map(Number);
                return (
                    new Date(ya, ma - 1, da).getTime() -
                    new Date(yb, mb - 1, db).getTime()
                );
            });
            setDates(sortedDates);
            setLinesByDate(_linesByDate);
            setCreditLines(_creditLines);
            setCreditValues({});
            setOutput("");
            setCorrectedContent("");
        };
        reader.readAsText(file);
    };

    const handleCreditChange = (date: string, value: string) => {
        setCreditValues((prev) => ({ ...prev, [date]: value }));
    };

    const processFile = () => {
        const hasValues = Object.values(creditValues).some(
            (v) => v && !isNaN(Number(v.replace(",", ".")))
        );
        if (hasValues) setIsConfirmModalOpen(true);
        else
            toastService.error(
                "Por favor, insira ao menos um valor de crédito válido."
            );
    };

    const executeProcessFile = () => {
        setIsConfirmModalOpen(false);
        let newLines: string[] = [...originalLines];
        Object.entries(linesByDate).forEach(([date, debitEntries]) => {
            const creditInputStr = creditValues[date];
            if (!creditInputStr || isNaN(Number(creditInputStr.replace(",", "."))))
                return;
            const creditInput = parseFloat(creditInputStr.replace(",", "."));
            const sortedDebits = [...debitEntries].sort((a, b) => b.value - a.value);
            let selectedDebits: DebitEntry[] = [];
            let sum = 0;
            for (const entry of sortedDebits) {
                if (sum + entry.value <= creditInput + 0.001) {
                    selectedDebits.push(entry);
                    sum += entry.value;
                }
            }
            if (selectedDebits.length > 0) {
                const totalWithoutLast = selectedDebits
                    .slice(0, -1)
                    .reduce((acc, curr) => acc + curr.value, 0);
                const lastDebit = selectedDebits[selectedDebits.length - 1];
                const lastValue = creditInput - totalWithoutLast;
                const parts = lastDebit.line.split("|");
                parts[7] = lastValue.toFixed(2).replace(".", ",");
                lastDebit.line = parts.join("|");
                newLines[lastDebit.index] = lastDebit.line;
            }
            if (creditLines[date]) {
                const creditLine = creditLines[date];
                const parts = creditLine.line.split("|");
                parts[7] = creditInput.toFixed(2).replace(".", ",");
                newLines[creditLine.index] = parts.join("|");
            }
        });
        const content = newLines.join("\n");
        setOutput(content);
        setCorrectedContent(content);
        toastService.success("Arquivo processado com sucesso!");
    };

    const downloadFile = () => {
        const blob = new Blob([correctedContent], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = originalFileName || "corrigido.txt";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const clearAll = () => {
        setOutput("");
        setDates([]);
        setLinesByDate({});
        setCreditLines({});
        setCreditValues({});
        setOriginalFileName("corrigido.txt");
        setCorrectedContent("");
        setOriginalLines([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <div className="ajuste-taxa-container">
            <h2>Ajuste de Taxas da Loja</h2>
            <input
                type="file"
                accept=".txt, .CON"
                ref={fileInputRef}
                onChange={handleFile}
                className="ajuste-taxa-file-input"
            />
            <div>
                {dates.map((date) => (
                    <div className="ajuste-taxa-credit-input" key={date}>
                        <label>
                            Valor de crédito para {date}:{" "}
                            <input
                                type="number"
                                step="0.01"
                                value={creditValues[date] || ""}
                                onChange={(e) => handleCreditChange(date, e.target.value)}
                            />
                        </label>
                    </div>
                ))}
            </div>
            <button className="ajuste-taxa-btn" onClick={processFile}>
                <i className="fas fa-magic"></i> Corrigir Arquivo
            </button>
            <button
                className="ajuste-taxa-btn"
                style={{ background: "#ef4444" }}
                onClick={clearAll}
            >
                <i className="fas fa-eraser"></i> Limpar Ajuste
            </button>
            {output && (
                <button
                    className="ajuste-taxa-btn"
                    style={{ marginLeft: 0 }}
                    onClick={downloadFile}
                >
                    <i className="fas fa-download"></i> Baixar Corrigido
                </button>
            )}
            <pre className="ajuste-taxa-output">{output}</pre>
            {isConfirmModalOpen && (
                <ConfirmacaoAjusteModal
                    onConfirm={executeProcessFile}
                    onCancel={() => setIsConfirmModalOpen(false)}
                />
            )}
        </div>
    );
};

export default AjusteTaxa;
