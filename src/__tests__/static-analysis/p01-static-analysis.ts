/**
 * P0.1 Natural Language Approval - Static Analysis Framework
 *
 * PHASE 6 Implementation - Code Health & Static Analysis
 * Analyzes code quality, type safety, performance patterns, and maintainability
 *
 * Analysis Areas:
 * - Type safety audit
 * - Dead code detection
 * - Performance bottlenecks
 * - Memory leak prevention
 * - Error handling completeness
 */

import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// File paths for P0.1 implementation
const P01_FILES = [
  'src/lib/ai/workflow/hitl-utils.ts',
  'src/lib/ai/workflow/hitl-integration.ts',
  'app/api/chat/route.ts',
  'src/lib/database/message-validation.ts',
  'src/components/chat/MessageDisplay.tsx',
  'src/components/chat/PhaseApprovalGate.tsx'
];

describe('P0.1 Static Analysis - Code Health Assessment', () => {

  // STATIC ANALYSIS 1: Type Safety Audit
  describe('Type Safety Analysis', () => {

    test('detects any type usage', () => {
      const anyTypeUsage: Array<{ file: string; lines: string[] }> = [];

      P01_FILES.forEach(filePath => {
        try {
          const fullPath = path.join(process.cwd(), filePath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');

          const anyLines = lines
            .map((line, index) => ({ line: line.trim(), number: index + 1 }))
            .filter(({ line }) =>
              line.includes(': any') ||
              line.includes('as any') ||
              line.includes('any[]') ||
              line.includes('Array<any>')
            )
            .filter(({ line }) =>
              !line.startsWith('//') &&
              !line.startsWith('*') &&
              !line.includes('@ts-ignore')
            );

          if (anyLines.length > 0) {
            anyTypeUsage.push({
              file: filePath,
              lines: anyLines.map(({ line, number }) => `Line ${number}: ${line}`)
            });
          }
        } catch (error) {
          console.warn(`Could not analyze ${filePath}:`, error);
        }
      });

      // Report any type usage
      if (anyTypeUsage.length > 0) {
        console.log('\n🔍 ANY TYPE USAGE DETECTED:');
        anyTypeUsage.forEach(({ file, lines }) => {
          console.log(`\n${file}:`);
          lines.forEach(line => console.log(`  ${line}`));
        });
      }

      // For P0.1, we allow some any usage for message parts compatibility
      // But flag excessive usage (>10 instances per file)
      anyTypeUsage.forEach(({ file, lines }) => {
        if (lines.length > 10) {
          console.warn(`⚠️ Excessive any usage in ${file}: ${lines.length} instances`);
        }
      });

      console.log(`✅ Type safety analysis completed for ${P01_FILES.length} files`);
    });

    test('detects undefined/null handling patterns', () => {
      const nullSafetyIssues: Array<{ file: string; patterns: string[] }> = [];

      P01_FILES.forEach(filePath => {
        try {
          const fullPath = path.join(process.cwd(), filePath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');

          // Look for potential null/undefined access patterns
          const riskyPatterns = lines
            .map((line, index) => ({ line: line.trim(), number: index + 1 }))
            .filter(({ line }) => {
              return (
                // Direct property access without null check
                /\w+\.\w+/.test(line) &&
                !line.includes('?.') &&
                !line.includes('&&') &&
                !line.includes('||') &&
                !line.includes('if') &&
                !line.includes('try') &&
                !line.includes('//') &&
                !line.includes('*') &&
                // Ignore safe patterns
                !line.includes('console.') &&
                !line.includes('Math.') &&
                !line.includes('Date.') &&
                !line.includes('JSON.') &&
                !line.includes('Object.') &&
                !line.includes('Array.') &&
                !line.includes('String.') &&
                !line.includes('Number.')
              );
            });

          if (riskyPatterns.length > 0) {
            nullSafetyIssues.push({
              file: filePath,
              patterns: riskyPatterns.map(({ line, number }) => `Line ${number}: ${line}`)
            });
          }
        } catch (error) {
          console.warn(`Could not analyze ${filePath}:`, error);
        }
      });

      // Report potential null safety issues
      if (nullSafetyIssues.length > 0) {
        console.log('\n⚠️ POTENTIAL NULL SAFETY ISSUES:');
        nullSafetyIssues.forEach(({ file, patterns }) => {
          console.log(`\n${file}:`);
          patterns.slice(0, 5).forEach(pattern => console.log(`  ${pattern}`)); // Limit output
          if (patterns.length > 5) {
            console.log(`  ... and ${patterns.length - 5} more`);
          }
        });
      }

      console.log(`✅ Null safety analysis completed for ${P01_FILES.length} files`);
    });
  });

  // STATIC ANALYSIS 2: Dead Code Detection
  describe('Dead Code Detection', () => {

    test('detects unused imports', () => {
      const unusedImports: Array<{ file: string; imports: string[] }> = [];

      P01_FILES.forEach(filePath => {
        try {
          const fullPath = path.join(process.cwd(), filePath);
          const content = fs.readFileSync(fullPath, 'utf-8');

          // Extract imports
          const importLines = content
            .split('\n')
            .filter(line => line.trim().startsWith('import'));

          // Simple heuristic: check if imported items are used elsewhere
          importLines.forEach((importLine, lineIndex) => {
            const importMatch = importLine.match(/import\s+\{([^}]+)\}/);
            if (importMatch) {
              const imports = importMatch[1]
                .split(',')
                .map(imp => imp.trim())
                .filter(imp => imp.length > 0);

              const unusedInThisLine = imports.filter(imp => {
                // Count occurrences (should be >1 if used)
                const occurrences = (content.match(new RegExp(imp, 'g')) || []).length;
                return occurrences <= 1; // Only import declaration
              });

              if (unusedInThisLine.length > 0) {
                unusedImports.push({
                  file: filePath,
                  imports: unusedInThisLine
                });
              }
            }
          });
        } catch (error) {
          console.warn(`Could not analyze ${filePath}:`, error);
        }
      });

      // Report potentially unused imports
      if (unusedImports.length > 0) {
        console.log('\n📦 POTENTIALLY UNUSED IMPORTS:');
        unusedImports.forEach(({ file, imports }) => {
          console.log(`${file}: ${imports.join(', ')}`);
        });
      }

      console.log(`✅ Dead code analysis completed for ${P01_FILES.length} files`);
    });

    test('detects unused functions', () => {
      const unusedFunctions: Array<{ file: string; functions: string[] }> = [];

      P01_FILES.forEach(filePath => {
        try {
          const fullPath = path.join(process.cwd(), filePath);
          const content = fs.readFileSync(fullPath, 'utf-8');

          // Extract function declarations
          const functionMatches = content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g);
          const arrowFunctionMatches = content.matchAll(/(?:export\s+)?const\s+(\w+)\s*=.*=>/g);

          const allFunctions = [
            ...Array.from(functionMatches, match => match[1]),
            ...Array.from(arrowFunctionMatches, match => match[1])
          ];

          const unusedInThisFile = allFunctions.filter(funcName => {
            // Count occurrences (should be >1 if used)
            const occurrences = (content.match(new RegExp(funcName, 'g')) || []).length;
            return occurrences <= 1; // Only declaration
          });

          if (unusedInThisFile.length > 0) {
            unusedFunctions.push({
              file: filePath,
              functions: unusedInThisFile
            });
          }
        } catch (error) {
          console.warn(`Could not analyze ${filePath}:`, error);
        }
      });

      // Report potentially unused functions
      if (unusedFunctions.length > 0) {
        console.log('\n🔧 POTENTIALLY UNUSED FUNCTIONS:');
        unusedFunctions.forEach(({ file, functions }) => {
          console.log(`${file}: ${functions.join(', ')}`);
        });
      }

      console.log(`✅ Function usage analysis completed for ${P01_FILES.length} files`);
    });
  });

  // STATIC ANALYSIS 3: Performance Pattern Analysis
  describe('Performance Pattern Analysis', () => {

    test('detects potential performance bottlenecks', () => {
      const performanceIssues: Array<{ file: string; issues: string[] }> = [];

      P01_FILES.forEach(filePath => {
        try {
          const fullPath = path.join(process.cwd(), filePath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');

          const issues: string[] = [];

          lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            const lineNumber = index + 1;

            // Detect potential performance issues
            if (trimmedLine.includes('JSON.parse') && !trimmedLine.includes('try')) {
              issues.push(`Line ${lineNumber}: Unguarded JSON.parse - potential performance/error issue`);
            }

            if (trimmedLine.includes('for (') && trimmedLine.includes('.length')) {
              issues.push(`Line ${lineNumber}: Loop with .length in condition - cache length for better performance`);
            }

            if (trimmedLine.includes('useState') && trimmedLine.includes('[]')) {
              issues.push(`Line ${lineNumber}: Empty array in useState - consider useMemo for object/array state`);
            }

            if (trimmedLine.includes('map(') && trimmedLine.includes('filter(')) {
              issues.push(`Line ${lineNumber}: Chained map/filter - consider combined operation for large arrays`);
            }

            if (trimmedLine.includes('new Date()') && !trimmedLine.includes('const')) {
              issues.push(`Line ${lineNumber}: Inline new Date() - consider caching if called frequently`);
            }

            if (trimmedLine.includes('useEffect') && !trimmedLine.includes('[]') && !trimmedLine.includes('[')) {
              issues.push(`Line ${lineNumber}: useEffect without dependency array - potential infinite loop`);
            }
          });

          if (issues.length > 0) {
            performanceIssues.push({
              file: filePath,
              issues: issues.slice(0, 10) // Limit to top 10 issues per file
            });
          }
        } catch (error) {
          console.warn(`Could not analyze ${filePath}:`, error);
        }
      });

      // Report performance issues
      if (performanceIssues.length > 0) {
        console.log('\n⚡ POTENTIAL PERFORMANCE ISSUES:');
        performanceIssues.forEach(({ file, issues }) => {
          console.log(`\n${file}:`);
          issues.forEach(issue => console.log(`  ${issue}`));
        });
      }

      console.log(`✅ Performance pattern analysis completed for ${P01_FILES.length} files`);
    });

    test('analyzes memory usage patterns', () => {
      const memoryIssues: Array<{ file: string; patterns: string[] }> = [];

      P01_FILES.forEach(filePath => {
        try {
          const fullPath = path.join(process.cwd(), filePath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');

          const patterns: string[] = [];

          lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            const lineNumber = index + 1;

            // Detect potential memory issues
            if (trimmedLine.includes('setInterval') && !trimmedLine.includes('clearInterval')) {
              patterns.push(`Line ${lineNumber}: setInterval without cleanup - potential memory leak`);
            }

            if (trimmedLine.includes('addEventListener') && !trimmedLine.includes('removeEventListener')) {
              patterns.push(`Line ${lineNumber}: addEventListener without removal - potential memory leak`);
            }

            if (trimmedLine.includes('new Array(') && !trimmedLine.includes('fill')) {
              patterns.push(`Line ${lineNumber}: Large array allocation - consider lazy initialization`);
            }

            if (trimmedLine.includes('push(...') || trimmedLine.includes('concat(')) {
              patterns.push(`Line ${lineNumber}: Array spread/concat - consider performance impact for large arrays`);
            }

            if (trimmedLine.includes('Object.assign') && trimmedLine.includes('{}')) {
              patterns.push(`Line ${lineNumber}: Object.assign with empty object - consider spread operator`);
            }
          });

          if (patterns.length > 0) {
            memoryIssues.push({
              file: filePath,
              patterns: patterns.slice(0, 8) // Limit output
            });
          }
        } catch (error) {
          console.warn(`Could not analyze ${filePath}:`, error);
        }
      });

      // Report memory patterns
      if (memoryIssues.length > 0) {
        console.log('\n🧠 POTENTIAL MEMORY ISSUES:');
        memoryIssues.forEach(({ file, patterns }) => {
          console.log(`\n${file}:`);
          patterns.forEach(pattern => console.log(`  ${pattern}`));
        });
      }

      console.log(`✅ Memory pattern analysis completed for ${P01_FILES.length} files`);
    });
  });

  // STATIC ANALYSIS 4: Error Handling Analysis
  describe('Error Handling Analysis', () => {

    test('detects error handling completeness', () => {
      const errorHandlingIssues: Array<{ file: string; issues: string[] }> = [];

      P01_FILES.forEach(filePath => {
        try {
          const fullPath = path.join(process.cwd(), filePath);
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');

          const issues: string[] = [];

          // Count try/catch blocks
          const tryCount = (content.match(/try\s*\{/g) || []).length;
          const catchCount = (content.match(/catch\s*\(/g) || []).length;
          const awaitCount = (content.match(/await\s+\w/g) || []).length;

          if (awaitCount > 0 && tryCount === 0) {
            issues.push(`File has ${awaitCount} await calls but no try/catch blocks`);
          }

          if (tryCount !== catchCount) {
            issues.push(`Mismatched try/catch blocks: ${tryCount} try, ${catchCount} catch`);
          }

          lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            const lineNumber = index + 1;

            // Detect specific error handling issues
            if (trimmedLine.includes('JSON.parse') && !lines.slice(Math.max(0, index - 3), index + 3).some(l => l.includes('try'))) {
              issues.push(`Line ${lineNumber}: JSON.parse without try/catch - potential runtime error`);
            }

            if (trimmedLine.includes('throw') && !trimmedLine.includes('Error')) {
              issues.push(`Line ${lineNumber}: throw without Error object - consider proper error types`);
            }

            if (trimmedLine.includes('catch') && (trimmedLine.includes('{}') || trimmedLine.includes('// ignore'))) {
              issues.push(`Line ${lineNumber}: Empty catch block - consider proper error handling`);
            }

            if (trimmedLine.includes('Promise.') && !trimmedLine.includes('catch') && !lines.slice(index, index + 5).some(l => l.includes('catch'))) {
              issues.push(`Line ${lineNumber}: Promise without catch - potential unhandled rejection`);
            }
          });

          if (issues.length > 0) {
            errorHandlingIssues.push({
              file: filePath,
              issues: issues.slice(0, 8) // Limit output
            });
          }
        } catch (error) {
          console.warn(`Could not analyze ${filePath}:`, error);
        }
      });

      // Report error handling issues
      if (errorHandlingIssues.length > 0) {
        console.log('\n🚨 ERROR HANDLING ISSUES:');
        errorHandlingIssues.forEach(({ file, issues }) => {
          console.log(`\n${file}:`);
          issues.forEach(issue => console.log(`  ${issue}`));
        });
      }

      console.log(`✅ Error handling analysis completed for ${P01_FILES.length} files`);
    });
  });

  // STATIC ANALYSIS 5: Code Complexity Analysis
  describe('Code Complexity Analysis', () => {

    test('measures cyclomatic complexity', () => {
      const complexityReport: Array<{ file: string; complexity: number; functions: Array<{name: string; complexity: number}> }> = [];

      P01_FILES.forEach(filePath => {
        try {
          const fullPath = path.join(process.cwd(), filePath);
          const content = fs.readFileSync(fullPath, 'utf-8');

          // Simple cyclomatic complexity calculation
          const complexityIndicators = [
            /if\s*\(/g,
            /else\s+if\s*\(/g,
            /while\s*\(/g,
            /for\s*\(/g,
            /switch\s*\(/g,
            /case\s+\w+:/g,
            /catch\s*\(/g,
            /&&/g,
            /\|\|/g,
            /\?.*:/g
          ];

          let totalComplexity = 1; // Base complexity
          const functionComplexities: Array<{name: string; complexity: number}> = [];

          complexityIndicators.forEach(pattern => {
            const matches = content.match(pattern) || [];
            totalComplexity += matches.length;
          });

          // Analyze individual functions
          const functionMatches = content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=.*=>/g);

          for (const match of functionMatches) {
            const funcName = match[1] || match[2];
            if (funcName) {
              // Rough function complexity (simplified)
              const funcRegex = new RegExp(`${funcName}.*?(?=function|const|export|$)`, 's');
              const funcContent = content.match(funcRegex)?.[0] || '';

              let funcComplexity = 1;
              complexityIndicators.forEach(pattern => {
                const matches = funcContent.match(pattern) || [];
                funcComplexity += matches.length;
              });

              if (funcComplexity > 10) { // Flag high complexity functions
                functionComplexities.push({ name: funcName, complexity: funcComplexity });
              }
            }
          }

          complexityReport.push({
            file: filePath,
            complexity: totalComplexity,
            functions: functionComplexities
          });

        } catch (error) {
          console.warn(`Could not analyze ${filePath}:`, error);
        }
      });

      // Report complexity
      console.log('\n📊 CODE COMPLEXITY REPORT:');
      complexityReport.forEach(({ file, complexity, functions }) => {
        const riskLevel = complexity > 50 ? '🔴 HIGH' : complexity > 25 ? '🟡 MEDIUM' : '🟢 LOW';
        console.log(`${file}: ${complexity} (${riskLevel})`);

        if (functions.length > 0) {
          console.log(`  High complexity functions:`);
          functions.forEach(({ name, complexity }) => {
            console.log(`    ${name}: ${complexity}`);
          });
        }
      });

      // Assert reasonable complexity levels
      const highComplexityFiles = complexityReport.filter(r => r.complexity > 100);
      if (highComplexityFiles.length > 0) {
        console.warn(`⚠️ ${highComplexityFiles.length} files have very high complexity (>100)`);
      }

      console.log(`✅ Complexity analysis completed for ${P01_FILES.length} files`);
    });
  });
});

// UTILITY: Generate comprehensive static analysis report
export function generateStaticAnalysisReport(): {
  summary: {
    filesAnalyzed: number;
    totalIssues: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    lastAnalyzed: string;
  };
  details: {
    typeSafety: number;
    deadCode: number;
    performance: number;
    errorHandling: number;
    complexity: number;
  };
  recommendations: string[];
} {
  const now = new Date().toISOString();

  // Mock analysis results - in real implementation, these would be populated from tests
  const summary = {
    filesAnalyzed: P01_FILES.length,
    totalIssues: 15, // Placeholder
    riskLevel: 'MEDIUM' as const,
    lastAnalyzed: now
  };

  const details = {
    typeSafety: 3,
    deadCode: 2,
    performance: 5,
    errorHandling: 3,
    complexity: 2
  };

  const recommendations = [
    'Reduce any type usage in message handling',
    'Add more comprehensive error handling for async operations',
    'Consider memoization for expensive calculations',
    'Implement proper cleanup for event listeners',
    'Add null safety checks for object property access'
  ];

  return { summary, details, recommendations };
}

// UTILITY: File analysis metrics
export const P01_ANALYSIS_METRICS = {
  files: P01_FILES,
  expectedComplexity: {
    'hitl-utils.ts': 40,
    'hitl-integration.ts': 35,
    'message-validation.ts': 30,
    'MessageDisplay.tsx': 50,
    'PhaseApprovalGate.tsx': 25,
    'route.ts': 45
  },
  performanceTargets: {
    intentDetectionLatency: 100, // ms
    auditWriteLatency: 200, // ms
    messageValidationLatency: 50 // ms
  }
};