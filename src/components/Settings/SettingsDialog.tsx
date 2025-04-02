import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Settings } from "lucide-react";
import { useToast } from "../../contexts/toast";

type OpenAIModel = {
  id: string;
  name: string;
  description: string;
};

type ModelCategory = {
  key: 'extractionModel' | 'solutionModel' | 'debuggingModel';
  title: string;
  description: string;
  models: OpenAIModel[];
};

// Define available models for each category
const modelCategories: ModelCategory[] = [
  {
    key: 'extractionModel',
    title: 'Problem Extraction',
    description: 'Model used to analyze screenshots and extract problem details',
    models: [
      {
        id: "gpt-4o",
        name: "gpt-4o",
        description: "Best overall performance for problem extraction"
      },
      {
        id: "gpt-4o-mini",
        name: "gpt-4o-mini",
        description: "Faster, more cost-effective option"
      }
    ]
  },
  {
    key: 'solutionModel',
    title: 'Solution Generation',
    description: 'Model used to generate coding solutions',
    models: [
      {
        id: "gpt-4o",
        name: "gpt-4o",
        description: "Strong overall performance for coding tasks"
      },
      {
        id: "gpt-4o-mini",
        name: "gpt-4o-mini",
        description: "Faster, more cost-effective option"
      }
    ]
  },
  {
    key: 'debuggingModel',
    title: 'Debugging',
    description: 'Model used to debug and improve solutions',
    models: [
      {
        id: "gpt-4o",
        name: "gpt-4o",
        description: "Best for analyzing code and error messages"
      },
      {
        id: "gpt-4o-mini",
        name: "gpt-4o-mini",
        description: "Faster, more cost-effective option"
      }
    ]
  }
];

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettingsDialog({ open: externalOpen, onOpenChange }: SettingsDialogProps) {
  const [open, setOpen] = useState(externalOpen || false);
  const [provider, setProvider] = useState<'openai' | 'claude'>('openai');
  const [apiKey, setApiKey] = useState("");
  const [claudeApiKey, setClaudeApiKey] = useState("");
  const [extractionModel, setExtractionModel] = useState("gpt-4o");
  const [solutionModel, setSolutionModel] = useState("gpt-4o");
  const [debuggingModel, setDebuggingModel] = useState("gpt-4o");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const { showToast } = useToast();

  // Sync with external open state
  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  // Handle open state changes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    // Only call onOpenChange when there's actually a change
    if (onOpenChange && newOpen !== externalOpen) {
      onOpenChange(newOpen);
    }
  };
  
  // Load current config on dialog open
  useEffect(() => {
    if (open) {
      setIsLoading(true);
      setValidationError("");
      window.electronAPI
        .getConfig()
        .then((config) => {
          setApiKey(config.apiKey || "");
          setClaudeApiKey(config.claudeApiKey || "");
          setProvider(config.provider || "openai");
          setExtractionModel(config.extractionModel || "gpt-4o");
          setSolutionModel(config.solutionModel || "gpt-4o");
          setDebuggingModel(config.debuggingModel || "gpt-4o");
        })
        .catch((error) => {
          console.error("Failed to load config:", error);
          showToast("Error", "Failed to load settings", "error");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, showToast]);

  // Validate API key format based on provider
  const validateApiKey = (key: string, provider: 'openai' | 'claude'): boolean => {
    if (provider === 'openai') {
      return /^sk-[a-zA-Z0-9]{32,}$/.test(key.trim());
    } else { // claude
      return /^sk[-_]ant[-_][a-zA-Z0-9]{32,}$/.test(key.trim());
    }
  };

  // Update the handleSave function
  const handleSave = async () => {
    // Clear previous validation errors
    setValidationError("");

    // Validate based on selected provider
    if (provider === 'openai' && apiKey && !validateApiKey(apiKey, 'openai')) {
      setValidationError("Invalid OpenAI API key format. Keys should start with 'sk-'");
      return;
    }
    
    if (provider === 'claude' && claudeApiKey && !validateApiKey(claudeApiKey, 'claude')) {
      setValidationError("Invalid Claude API key format. Keys should start with 'sk-ant-' or 'sk_ant_'");
      return;
    }

    // Check if the required API key is provided
    if (provider === 'openai' && !apiKey) {
      setValidationError("OpenAI API key is required");
      return;
    }
    
    if (provider === 'claude' && !claudeApiKey) {
      setValidationError("Claude API key is required");
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.electronAPI.updateConfig({
        provider,
        apiKey,
        claudeApiKey,
        extractionModel,
        solutionModel,
        debuggingModel,
      });
      
      if (result) {
        showToast("Success", "Settings saved successfully", "success");
        handleOpenChange(false);
        
        // Force reload the app to apply changes
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("Error", "Failed to save settings", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Mask API key for display
  const maskApiKey = (key: string) => {
    if (!key || key.length < 10) return "";
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  // Open external link handler
  const openExternalLink = (url: string) => {
    window.electronAPI.openLink(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Removed unnecessary dialog trigger - using the icon in QueueCommands instead */}
      <DialogContent 
        className="sm:max-w-md bg-black border border-white/10 text-white settings-dialog"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(450px, 90vw)',
          height: 'auto',
          minHeight: '400px',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 9999,
          margin: 0,
          padding: '20px',
          opacity: 0.98,
          animation: 'fadeInSimple 0.2s ease-out'
        }}
      >        
        <DialogHeader>
          <DialogTitle>AI Provider Settings</DialogTitle>
          <DialogDescription className="text-white/70">
            Configure your API settings and model preferences. You'll need your own API key to use this application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Provider Selection */}
          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium text-white">AI Provider</label>
            <div className="flex flex-col space-y-2">
              <div 
                className={`p-2 rounded-lg cursor-pointer transition-colors ${
                  provider === "openai"
                    ? "bg-white/10 border border-white/20"
                    : "bg-black/30 border border-white/5 hover:bg-white/5"
                }`}
                onClick={() => setProvider("openai")}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      provider === "openai" ? "bg-white" : "bg-white/20"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-white text-xs">OpenAI (GPT-4o)</p>
                    <p className="text-xs text-white/60">Multiple model options, excellent code generation</p>
                  </div>
                </div>
              </div>
              
              <div 
                className={`p-2 rounded-lg cursor-pointer transition-colors ${
                  provider === "claude"
                    ? "bg-white/10 border border-white/20"
                    : "bg-black/30 border border-white/5 hover:bg-white/5"
                }`}
                onClick={() => setProvider("claude")}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      provider === "claude" ? "bg-white" : "bg-white/20"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-white text-xs">Claude 3.7 Sonnet</p>
                    <p className="text-xs text-white/60">Advanced reasoning, thorough analysis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validation error message */}
          {validationError && (
            <div className="p-2 bg-red-900/20 border border-red-500/30 rounded-md text-red-400 text-xs">
              {validationError}
            </div>
          )}

          {/* OpenAI API Key Input - show only when OpenAI is selected */}
          {provider === "openai" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white" htmlFor="apiKey">
                OpenAI API Key
              </label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="bg-black/50 border-white/10 text-white"
              />
              {apiKey && (
                <p className="text-xs text-white/50">
                  Current: {maskApiKey(apiKey)}
                </p>
              )}
              <p className="text-xs text-white/50">
                Your API key is stored locally and never sent to any server except OpenAI
              </p>
              <div className="mt-2 p-2 rounded-md bg-white/5 border border-white/10">
                <p className="text-xs text-white/80 mb-1">Don't have an API key?</p>
                <p className="text-xs text-white/60 mb-1">1. Create an account at <button 
                  onClick={() => openExternalLink('https://platform.openai.com/signup')} 
                  className="text-blue-400 hover:underline cursor-pointer">OpenAI</button>
                </p>
                <p className="text-xs text-white/60 mb-1">2. Go to <button 
                  onClick={() => openExternalLink('https://platform.openai.com/api-keys')} 
                  className="text-blue-400 hover:underline cursor-pointer">API Keys</button> section
                </p>
                <p className="text-xs text-white/60">3. Create a new secret key and paste it here</p>
              </div>
            </div>
          )}

          {/* Claude API Key Input - show only when Claude is selected */}
          {provider === "claude" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white" htmlFor="claudeApiKey">
                Claude API Key
              </label>
              <Input
                id="claudeApiKey"
                type="password"
                value={claudeApiKey}
                onChange={(e) => setClaudeApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="bg-black/50 border-white/10 text-white"
              />
              {claudeApiKey && (
                <p className="text-xs text-white/50">
                  Current: {maskApiKey(claudeApiKey)}
                </p>
              )}
              <p className="text-xs text-white/50">
                Your API key is stored locally and never sent to any server except Anthropic
              </p>
              <div className="mt-2 p-2 rounded-md bg-white/5 border border-white/10">
                <p className="text-xs text-white/80 mb-1">Don't have a Claude API key?</p>
                <p className="text-xs text-white/60 mb-1">1. Create an account at <button 
                  onClick={() => openExternalLink('https://console.anthropic.com')} 
                  className="text-blue-400 hover:underline cursor-pointer">Anthropic Console</button>
                </p>
                <p className="text-xs text-white/60 mb-1">2. Go to API Keys section in the console</p>
                <p className="text-xs text-white/60">3. Create a new API key and paste it here</p>
              </div>
            </div>
          )}

          {/* Model selection - only show when OpenAI is selected */}
          {provider === "openai" && (
            <div className="space-y-4 mt-4">
              <label className="text-sm font-medium text-white">AI Model Selection</label>
              <p className="text-xs text-white/60 -mt-3 mb-2">
                Select which models to use for each stage of the process
              </p>
              
              {modelCategories.map((category) => (
                <div key={category.key} className="mb-4">
                  <label className="text-sm font-medium text-white mb-1 block">
                    {category.title}
                  </label>
                  <p className="text-xs text-white/60 mb-2">{category.description}</p>
                  
                  <div className="space-y-2">
                    {category.models.map((m) => {
                      // Determine which state to use based on category key
                      const currentValue = 
                        category.key === 'extractionModel' ? extractionModel :
                        category.key === 'solutionModel' ? solutionModel :
                        debuggingModel;
                      
                      // Determine which setter function to use
                      const setValue = 
                        category.key === 'extractionModel' ? setExtractionModel :
                        category.key === 'solutionModel' ? setSolutionModel :
                        setDebuggingModel;
                        
                      return (
                        <div
                          key={m.id}
                          className={`p-2 rounded-lg cursor-pointer transition-colors ${
                            currentValue === m.id
                              ? "bg-white/10 border border-white/20"
                              : "bg-black/30 border border-white/5 hover:bg-white/5"
                          }`}
                          onClick={() => setValue(m.id)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                currentValue === m.id ? "bg-white" : "bg-white/20"
                              }`}
                            />
                            <div>
                              <p className="font-medium text-white text-xs">{m.name}</p>
                              <p className="text-xs text-white/60">{m.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Note about Claude model when selected */}
          {provider === "claude" && (
            <div className="space-y-2 mt-4 p-3 bg-white/5 rounded-lg">
              <label className="text-sm font-medium text-white">AI Model</label>
              <p className="text-xs text-white/70 mb-2">Using Claude 3.7 Sonnet with extended thinking capabilities for optimal results.</p>
              <p className="text-xs text-white/60">Claude 3.7 Sonnet is Anthropic's most advanced model, offering excellent code generation, problem-solving, and reasoning capabilities.</p>
            </div>
          )}
          
          <div className="space-y-2 mt-4">
            <label className="text-sm font-medium text-white mb-2 block">Keyboard Shortcuts</label>
            <div className="bg-black/30 border border-white/10 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <div className="text-white/70">Toggle Visibility</div>
                <div className="text-white/90 font-mono">Ctrl+B / Cmd+B</div>
                
                <div className="text-white/70">Take Screenshot</div>
                <div className="text-white/90 font-mono">Ctrl+H / Cmd+H</div>
                
                <div className="text-white/70">Process Screenshots</div>
                <div className="text-white/90 font-mono">Ctrl+Enter / Cmd+Enter</div>
                
                <div className="text-white/70">Delete Last Screenshot</div>
                <div className="text-white/90 font-mono">Ctrl+L / Cmd+L</div>
                
                <div className="text-white/70">Reset View</div>
                <div className="text-white/90 font-mono">Ctrl+R / Cmd+R</div>
                
                <div className="text-white/70">Quit Application</div>
                <div className="text-white/90 font-mono">Ctrl+Q / Cmd+Q</div>
                
                <div className="text-white/70">Move Window</div>
                <div className="text-white/90 font-mono">Ctrl+Arrow Keys</div>
                
                <div className="text-white/70">Adjust Opacity</div>
                <div className="text-white/90 font-mono">Ctrl+[ / Ctrl+]</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-white/10 hover:bg-white/5 text-white"
          >
            Cancel
          </Button>
          <Button
            className="px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}