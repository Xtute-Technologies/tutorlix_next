"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { productAPI, categoryAPI } from "@/lib/lmsService";
import { authService } from "@/lib/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("./Editor"), { ssr: false, loading: () => <p>Loading editor...</p> });

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  GripVertical,
  ArrowLeft,
  LayoutDashboard,
  Save,
  Users,
  IndianRupee,
  FileText,
  Layers,
  Settings,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Utility: Debounce Hook ---
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- Component: Step Indicator ---
const StepIndicator = ({ steps, currentStep, setStep, completedSteps, isProductCreated }) => {
  return (
    <div className="w-full bg-background border-b sticky top-16 z-30 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Progress Bar Background */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full -z-10" />
          
          {/* Active Progress */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full transition-all duration-500 -z-10" 
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step, index) => {
            const isActive = index === currentStep;
            // Allow access if product is created (saved), or if strictly previous step/completed
            const isAccessible = isProductCreated || index <= currentStep + 1 || completedSteps.includes(index); 
            // We can simplify: If product exists, all tabs are open. If not, only linear progression.
            // Requirement: "if step one is only compulsary so allow chanign steps after taht"
            // Step 1 is index 0. If product created, isProductCreated=true.
            
            const isCompleted = index < currentStep || completedSteps.includes(index);
            const canNavigate = isProductCreated || isCompleted || index === currentStep;

            const Icon = step.icon;

            return (
              <button
                key={index}
                onClick={() => canNavigate ? setStep(index) : null}
                className={cn(
                  "flex flex-col items-center gap-2 group focus:outline-none transition-all duration-300",
                  canNavigate ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 bg-background transition-all duration-300 z-10",
                    isActive ? "border-primary text-primary shadow-[0_0_0_4px_rgba(0,0,0,0.05)] scale-110" : 
                    isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted && !isActive ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider bg-background px-2 py-0.5 rounded-full transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Step 1: Essentials (Product Shell) ---
const StepEssentials = ({ formData, setFormData, categories, teachers }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Core Identity */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-primary" />
                Core Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base">Product Title <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. Master Full Stack Development 2024"
                  className="h-12 text-lg font-medium"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label>Short Description (SEO) <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="A concise summary (150-300 chars) used for search results and course cards..."
                  className="h-28 resize-none leading-relaxed"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <div className="flex justify-end">
                   <span className={cn("text-xs font-medium", formData.description?.length > 160 ? "text-green-600" : "text-muted-foreground")}>
                     {formData.description?.length || 0} characters
                   </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Instructors & Category
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Category <span className="text-destructive">*</span></Label>
                        <Select
                        value={formData.category?.toString()}
                        onValueChange={(val) => setFormData({ ...formData, category: val })}
                        >
                        <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                    
                  
                </div>

                <div className="space-y-2">
                    <Label>Assign Instructors</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-xl border border-dashed">
                        {teachers.map((t) => {
                            const isSelected = formData.instructors?.includes(t.id);
                            return (
                                <div 
                                    key={t.id} 
                                    onClick={() => {
                                        const newInstructors = isSelected
                                            ? (formData.instructors || []).filter(id => id !== t.id)
                                            : [...(formData.instructors || []), t.id];
                                        setFormData({ ...formData, instructors: newInstructors });
                                    }}
                                    className={cn(
                                        "flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm",
                                        isSelected ? "bg-primary/5 border-primary ring-1 ring-primary" : "bg-background border-border hover:border-primary/50"
                                    )}
                                >
                                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors", isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                        {t.first_name?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={cn("text-sm font-medium truncate", isSelected ? "text-primary" : "text-foreground")}>
                                            {t.first_name} {t.last_name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground truncate">{t.email}</p>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Pricing Strategy */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-l-4 border-l-primary shadow-md">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <IndianRupee className="w-5 h-5" />
                Pricing Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-3">
                <Label>Base Price (₹) <span className="text-destructive">*</span></Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-8 text-lg font-bold"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center justify-between">
                    Discounted Price
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Optional</Badge>
                </Label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                    <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-8 text-lg font-bold text-green-600"
                    value={formData.discounted_price}
                    onChange={(e) => setFormData({ ...formData, discounted_price: e.target.value })}
                    />
                </div>
                {formData.price && formData.discounted_price && Number(formData.price) > Number(formData.discounted_price) && (
                    <p className="text-xs text-green-600 font-medium text-right">
                        {Math.round(((formData.price - formData.discounted_price) / formData.price) * 100)}% OFF
                    </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
             <div className="flex gap-3">
                <div className="bg-blue-100 p-2 rounded-full h-fit text-blue-600"><Sparkles className="h-4 w-4" /></div>
                <div>
                    <h4 className="text-sm font-bold text-blue-800">Auto-Creation</h4>
                    <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                        Completing this step will automatically create the product draft in the system so you don't lose progress.
                    </p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Step 2: Curriculum ---
const StepCurriculum = ({ formData, setFormData }) => {
    const { curriculum } = formData;
    const [activeModule, setActiveModule] = useState(0);

    // Ensure IDs exist for DnD stability
    useEffect(() => {
        const needsUpdate = curriculum.some(m => !m.id || m.lessons.some(l => !l.id));
        if (needsUpdate) {
            const newCurriculum = curriculum.map(m => ({
                ...m,
                id: m.id || Math.random().toString(36).substr(2, 9),
                lessons: (m.lessons || []).map(l => ({
                    ...l,
                    id: l.id || Math.random().toString(36).substr(2, 9)
                }))
            }));
            // Use functional update to avoid dependency loops if relying on direct references
            setFormData(prev => ({ ...prev, curriculum: newCurriculum }));
        }
    }, [curriculum.length]); // Simple dependency to catch loads/adds

    const addModule = () => {
        const newCurriculum = [...curriculum, { id: Math.random().toString(36).substr(2, 9), title: "New Module", lessons: [] }];
        setFormData({ ...formData, curriculum: newCurriculum });
        setActiveModule(newCurriculum.length - 1);
    };

    const updateModule = (index, field, value) => {
        const newCurriculum = [...curriculum];
        newCurriculum[index][field] = value;
        setFormData({ ...formData, curriculum: newCurriculum });
    };

    const removeModule = (index) => {
        if (!confirm("Delete module?")) return;
        const newCurriculum = curriculum.filter((_, i) => i !== index);
        setFormData({ ...formData, curriculum: newCurriculum });
        if (activeModule >= index && activeModule > 0) setActiveModule(activeModule - 1);
    };

    const addLesson = (moduleIndex) => {
        const newCurriculum = [...curriculum];
        newCurriculum[moduleIndex].lessons.push({ id: Math.random().toString(36).substr(2, 9), title: "", type: "video" });
        setFormData({ ...formData, curriculum: newCurriculum });
    };

    const updateLesson = (moduleIndex, lessonIndex, field, value) => {
        const newCurriculum = [...curriculum];
        newCurriculum[moduleIndex].lessons[lessonIndex][field] = value;
        setFormData({ ...formData, curriculum: newCurriculum });
    };
    
    const removeLesson = (moduleIndex, lessonIndex) => {
        const newCurriculum = [...curriculum];
        newCurriculum[moduleIndex].lessons = newCurriculum[moduleIndex].lessons.filter((_, i) => i !== lessonIndex);
        setFormData({ ...formData, curriculum: newCurriculum });
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;

        if (result.type === "module") {
            const items = Array.from(curriculum);
            const [reorderedItem] = items.splice(result.source.index, 1);
            items.splice(result.destination.index, 0, reorderedItem);
            
            setFormData({ ...formData, curriculum: items });
            
            // Adjust active module selection
            if (activeModule === result.source.index) setActiveModule(result.destination.index);
            else if (activeModule > result.source.index && activeModule <= result.destination.index) setActiveModule(activeModule - 1);
            else if (activeModule < result.source.index && activeModule >= result.destination.index) setActiveModule(activeModule + 1);

        } else if (result.type === "lesson") {
            const moduleIndex = activeModule;
            const newCurriculum = [...curriculum];
            const lessons = Array.from(newCurriculum[moduleIndex].lessons);
            const [reorderedItem] = lessons.splice(result.source.index, 1);
            lessons.splice(result.destination.index, 0, reorderedItem);
            newCurriculum[moduleIndex].lessons = lessons;
            setFormData({ ...formData, curriculum: newCurriculum });
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px] animate-in fade-in slide-in-from-right-8 duration-500">
             {/* Sidebar */}
             <Card className="lg:col-span-1 h-full flex flex-col border-r-0 lg:border-r rounded-none lg:rounded-xl shadow-none lg:shadow-sm">
                 <CardHeader className="pb-4 border-b bg-muted/10">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base">Course Structure</CardTitle>
                        <Button onClick={addModule} size="sm" variant="secondary" className="h-8"><Plus className="h-3 w-3 mr-1" /> Module</Button>
                    </div>
                 </CardHeader>
                 <ScrollArea className="flex-1 p-4">
                    <Droppable droppableId="modules-list" type="module">
                    {(provided) => (
                    <div className="space-y-3" {...provided.droppableProps} ref={provided.innerRef}>
                        {curriculum.length === 0 && (
                             <div className="text-center py-10 px-4 border-2 border-dashed rounded-xl bg-muted/20">
                                 <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                 <p className="text-sm text-muted-foreground">No modules yet.</p>
                             </div>
                        )}
                        {curriculum.map((module, idx) => (
                           <Draggable key={module.id || idx} draggableId={module.id || `module-${idx}`} index={idx}>
                           {(dragProvided) => (
                           <div 
                               ref={dragProvided.innerRef}
                               {...dragProvided.draggableProps}
                               {...dragProvided.dragHandleProps}
                               onClick={() => setActiveModule(idx)}
                               className={cn(
                                   "p-4 rounded-xl border cursor-pointer transition-all group relative",
                                   activeModule === idx ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" : "bg-card hover:border-primary/30"
                               )}
                           >
                               <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-3 overflow-hidden">
                                       <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0", activeModule === idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                           {idx + 1}
                                       </div>
                                       <span className="font-semibold text-sm truncate">{module.title || "Untitled Module"}</span>
                                   </div>
                                   <Button 
                                       size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                       onClick={(e) => { e.stopPropagation(); removeModule(idx); }}
                                   >
                                       <Trash2 className="h-3 w-3" />
                                   </Button>
                               </div>
                               <div className="mt-2 pl-9 text-xs text-muted-foreground font-medium">
                                   {(module.lessons || []).length} Lessons
                               </div>
                           </div>
                           )}
                           </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                    )}
                    </Droppable>
                 </ScrollArea>
             </Card>

             {/* Editor Area */}
             <Card className="lg:col-span-2 h-full flex flex-col shadow-sm">
                 {curriculum[activeModule] ? (
                     <>
                        <CardHeader className="border-b bg-muted/5 pb-6">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 font-bold">Module Title</Label>
                            <Input 
                                value={curriculum[activeModule].title}
                                onChange={(e) => updateModule(activeModule, 'title', e.target.value)}
                                className="text-xl font-bold bg-transparent border-0 border-b rounded-none px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary h-auto py-2"
                                placeholder="Enter module name..."
                            />
                        </CardHeader>
                        <ScrollArea className="flex-1 p-6">
                            <Droppable droppableId="lessons-list" type="lesson">
                            {(provided) => (
                            <div className="space-y-4" {...provided.droppableProps} ref={provided.innerRef}>
                                {(curriculum[activeModule].lessons || []).map((lesson, lIdx) => (
                                    <Draggable key={lesson.id || lIdx} draggableId={lesson.id || `lesson-${lIdx}`} index={lIdx}>
                                    {(dragProvided) => (
                                    <div 
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        className="flex gap-3 items-center bg-card p-3 rounded-xl border group hover:shadow-md transition-all"
                                    >
                                        <div {...dragProvided.dragHandleProps}>
                                            <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-move" />
                                        </div>
                                        <Select value={lesson.type} onValueChange={(val) => updateLesson(activeModule, lIdx, 'type', val)}>
                                            <SelectTrigger className="w-[110px] h-9 text-xs font-medium bg-muted/50 border-0">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="video"> Video</SelectItem>
                                                <SelectItem value="article"> Article</SelectItem>
                                                <SelectItem value="quiz"> Quiz</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input 
                                            value={lesson.title}
                                            onChange={(e) => updateLesson(activeModule, lIdx, 'title', e.target.value)}
                                            className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0 font-medium"
                                            placeholder="Lesson Title..."
                                        />
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeLesson(activeModule, lIdx)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                                <Button variant="outline" className="w-full border-dashed py-6 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5" onClick={() => addLesson(activeModule)}>
                                    <Plus className="h-4 w-4 mr-2" /> Add New Lesson
                                </Button>
                            </div>
                            )}
                            </Droppable>
                        </ScrollArea>
                     </>
                 ) : (
                     <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 p-12 text-center">
                         <Layers className="h-16 w-16 mb-4" />
                         <h3 className="text-lg font-medium">No Module Selected</h3>
                         <p>Select a module from the left to edit its content.</p>
                     </div>
                 )}
             </Card>
        </div>
        </DragDropContext>
    );
};

// --- Step 3: Detailed Content ---
const StepDetailedContent = ({ formData, setFormData }) => {
    return (
        <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Comprehensive Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Editor
                        value={formData.overview}
                        onChange={(val) => setFormData({ ...formData, overview: val })}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Key Highlights</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.features.map((feature, index) => (
                            <div key={index} className="flex gap-2 items-center group">
                                <div className="h-8 w-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                                    <Check className="h-4 w-4" />
                                </div>
                                <Input 
                                    value={feature} 
                                    onChange={(e) => {
                                        const newFeatures = [...formData.features];
                                        newFeatures[index] = e.target.value;
                                        setFormData({ ...formData, features: newFeatures });
                                    }}
                                    placeholder="e.g. 100+ Hours of Video"
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100" onClick={() => {
                                    const newFeatures = formData.features.filter((_, i) => i !== index);
                                    setFormData({ ...formData, features: newFeatures });
                                }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button variant="outline" className="w-full border-dashed h-10" onClick={() => setFormData({ ...formData, features: [...formData.features, ""] })}>
                            <Plus className="mr-2 h-4 w-4" /> Add Highlight
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// --- Step 4: Media ---
const StepMedia = ({ existingImages, onUploadFile, onDeleteExisting }) => {
    // We maintain the upload queue logic internal to StepImages in the previous version, 
    // keeping it simplified here for brevity but assuming the Queue Logic exists (refer to previous snippet)
    // Re-implementing simplified version:
    
    return (
        <div className="space-y-8 max-w-6xl mx-auto animate-in fade-in zoom-in-95 duration-500">
             <div className="border-2 border-dashed rounded-2xl p-16 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer relative group">
                 <input 
                    type="file" 
                    multiple 
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => {
                        Array.from(e.target.files).forEach(file => onUploadFile(file, () => {}));
                        e.target.value = ''; // Reset
                    }}
                 />
                 <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform shadow-inner">
                     <ImageIcon className="h-10 w-10" />
                 </div>
                 <h3 className="font-bold text-2xl mb-2">Upload Product Gallery</h3>
                 <p className="text-muted-foreground">Drag & drop or click to browse</p>
             </div>

             {existingImages.length > 0 && (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                     {existingImages.map((img) => (
                         <div key={img.id} className="group relative aspect-[4/3] border rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all">
                             <img src={img.image_url || img.image} alt="Product" className="w-full h-full object-cover" />
                             {img.is_primary && (
                                 <span className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded shadow-sm z-20">MAIN</span>
                             )}
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10 backdrop-blur-[1px]">
                                 <Button size="icon" variant="destructive" className="h-9 w-9 rounded-full" onClick={() => onDeleteExisting(img.id)}>
                                     <Trash2 className="h-4 w-4" />
                                 </Button>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
        </div>
    );
};

// --- Step 5: Settings ---
const StepSettings = ({ formData, setFormData }) => {
    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-2">
                            <Label>Total Seats</Label>
                            <Input
                                type="number"
                                value={formData.total_seats}
                                onChange={(e) => setFormData({ ...formData, total_seats: e.target.value })}
                                className="text-lg font-medium"
                            />
                            <p className="text-xs text-muted-foreground">Limit the number of enrollments (e.g. 100).</p>
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label>Access Duration (Days)</Label>
                            <Input
                                type="number"
                                value={formData.duration_days}
                                onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                                className="text-lg font-medium"
                            />
                            <p className="text-xs text-muted-foreground">Enter '0' for lifetime access.</p>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border">
                        <div>
                            <h4 className="font-medium">Publish Status</h4>
                            <p className="text-xs text-muted-foreground">Make this product visible to students immediately.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={cn("text-sm font-medium", !formData.is_active && "text-muted-foreground")}>Draft</span>
                            <Switch 
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                            />
                            <span className={cn("text-sm font-medium", formData.is_active && "text-green-600")}>Active</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// --- Main Wizard Component ---
export default function ProductWizard({ initialData = null }) {
  const router = useRouter();
  const [initLoading, setInitLoading] = useState(true);
  
  // Resources
  const [categories, setCategories] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Form State
  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([0]); // Track completed
  const [productId, setProductId] = useState(initialData?.id || null);
  const PRODUCT_ID_REF = useRef(initialData?.id || null);
  const CREATE_PROMISE_REF = useRef(null);

  const [formData, setFormData] = useState({
    name: "", category: "", total_seats: 100, price: "", discounted_price: "",
    duration_days: 0, description: "", overview: "", instructors: [],
    is_active: false, curriculum: [], features: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const debouncedFormData = useDebounce(formData, 1500); 
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => { PRODUCT_ID_REF.current = productId; }, [productId]);

  // Fetch Resources
  useEffect(() => {
    const fetchResources = async () => {
        try {
            const [cats, teacs] = await Promise.all([
                categoryAPI.getAll(),
                authService.getAllUsers({ role: 'teacher' })
            ]);
            setCategories(cats || []);
            setTeachers(teacs?.results || []);
        } catch (error) { console.error(error); } finally { setInitLoading(false); }
    };
    fetchResources();
  }, []);

  // Init Data
  useEffect(() => {
    if (initialData) {
        setFormData({
            name: initialData.name || "",
            category: initialData.category?.toString() || "",
            total_seats: initialData.total_seats || 100,
            price: initialData.price || "",
            discounted_price: initialData.discounted_price || "",
            duration_days: initialData.duration_days || 0,
            description: initialData.description || "",
            overview: initialData.overview || "",
            instructors: initialData.instructors?.map(i => i.id) || [],
            is_active: initialData.is_active || false,
            curriculum: initialData.curriculum || [],
            features: initialData.features || [],
        });
        setExistingImages(initialData.images || []);
        setProductId(initialData.id);
    }
  }, [initialData]);

  const preparePayload = (data) => ({
    ...data,
    category: parseInt(data.category),
    total_seats: parseInt(data.total_seats),
    price: parseFloat(data.price),
    discounted_price: data.discounted_price ? parseFloat(data.discounted_price) : null,
    duration_days: parseInt(data.duration_days),
  });

  // --- Auto-Create & Save Logic ---
  const handleStepChange = async (newStep) => {
      // Logic when moving FROM Step 0 (Essentials) TO Step 1
      if (step === 0 && newStep > 0 && !productId) {
          if (!formData.name || !formData.category || !formData.price) {
              toast.error("Please fill in Name, Category, and Price to continue.");
              return;
          }

          setIsSaving(true);
          try {
              const payload = preparePayload(formData);
              const res = await productAPI.create(payload);
              setProductId(res.id);
              setLastSaved(new Date());
              window.history.replaceState(null, '', `/admin/products/${res.id}`);
              toast.success("Product Draft Created", { description: "Auto-saving is now enabled." });
              setCompletedSteps(prev => [...prev, step]);
              setStep(newStep);
          } catch (error) {
              console.error(error);
              toast.error("Failed to create draft", { description: error.response?.data?.detail || "Check your inputs." });
          } finally {
              setIsSaving(false);
          }
      } else {
          // Normal navigation
          if (newStep > step) setCompletedSteps(prev => [...new Set([...prev, step])]);
          setStep(newStep);
      }
  };

  // Auto-Save Effect
  useEffect(() => {
      const performAutoSave = async () => {
          if (!productId) return; 
          try {
              setIsSaving(true);
              const payload = preparePayload(debouncedFormData);
              await productAPI.update(productId, payload);
              setLastSaved(new Date());
          } catch (error) { console.warn("Auto-save failed", error); } finally { setIsSaving(false); }
      };
      if (productId) performAutoSave();
  }, [debouncedFormData, productId]);

  const handleUploadFile = async (file, onProgress) => {
      try {
          // If uploading before product exists (unlikely given step order, but safe check)
          if (!productId) {
             toast.error("Please complete the Essentials step first.");
             return;
          }
          await productAPI.uploadImages(productId, file, (e) => onProgress(Math.round((e.loaded * 100) / e.total)));
          const updated = await productAPI.getById(productId);
          setExistingImages(updated.images || []);
      } catch (error) {
          toast.error("Upload failed");
      }
  };

  const deleteExistingImage = async (imageId) => {
      if (!confirm("Are you sure?")) return;
      try {
          await productAPI.deleteImage(productId, imageId);
          setExistingImages(prev => prev.filter(img => img.id !== imageId));
      } catch (err) { console.error(err); }
  };

  const handleFinalSave = async () => {
      router.push('/admin/products');
      toast.success("Product Saved Successfully!");
  };

  if (initLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  const steps = [
    { title: "Essentials", icon: LayoutDashboard, component: StepEssentials },
    { title: "Curriculum", icon: Layers, component: StepCurriculum },
    { title: "Details", icon: FileText, component: StepDetailedContent },
    { title: "Media", icon: ImageIcon, component: StepMedia },
    { title: "Settings", icon: Settings, component: StepSettings },
  ];

  const CurrentStep = steps[step].component;

  return (
    <div className="relative min-h-screen w-full pb-32 font-sans text-foreground">
        
        {/* Top Header */}
        <div className="bg-background border-b h-16 flex items-center px-6 sticky top-0 z-40 justify-between shadow-sm">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/admin/products')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col">
                    <h1 className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">{formData.name || "New Product"}</h1>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {isSaving ? <span className="text-blue-500 flex items-center"><Loader2 className="h-2 w-2 animate-spin mr-1"/> Saving...</span> : lastSaved ? <span className="text-green-600 flex items-center"><Check className="h-2 w-2 mr-1"/> Saved {lastSaved.toLocaleTimeString()}</span> : "Unsaved"}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1 border">
                    <span className={cn("text-[10px] font-bold uppercase", formData.is_active ? "text-green-600" : "text-muted-foreground")}>
                        {formData.is_active ? "Live" : "Draft"}
                    </span>
                    <Switch checked={formData.is_active} onCheckedChange={(c) => setFormData(p => ({...p, is_active: c}))} className="scale-75" />
                </div>
                <Button onClick={handleFinalSave} disabled={isSaving} className="font-bold shadow-md shadow-primary/20">
                    Finish & Exit
                </Button>
            </div>
        </div>

        {/* Steps */}
        <StepIndicator 
            steps={steps} 
            currentStep={step} 
            setStep={handleStepChange} 
            completedSteps={completedSteps} 
            isProductCreated={!!productId} 
        />

        {/* Content Body */}
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
            <CurrentStep 
                formData={formData} 
                setFormData={setFormData}
                categories={categories}
                teachers={teachers}
                existingImages={existingImages}
                onUploadFile={handleUploadFile}
                onDeleteExisting={deleteExistingImage}
            />
        </div>

        {/* Footer Navigation */}
        <div className="sticky bottom-0 left-0 right-0 bg-background/80 backdrop-blur-lg border-t p-4 z-40">
            <div className="max-w-[1600px] mx-auto flex justify-between items-center">
                <Button 
                    variant="outline" 
                    onClick={() => handleStepChange(step - 1)} 
                    disabled={step === 0}
                    className="gap-2"
                >
                    <ChevronLeft className="h-4 w-4" /> Back
                </Button>
                
                {step < steps.length - 1 ? (
                    <Button onClick={() => handleStepChange(step + 1)} size="lg" className="gap-2 shadow-lg shadow-primary/20" disabled={isSaving}>
                        {step === 0 && !productId ? (isSaving ? "Creating..." : "Save & Continue") : "Continue"} 
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button onClick={handleFinalSave} size="lg" className="bg-green-600 hover:bg-green-700 gap-2 shadow-lg">
                        <Check className="h-4 w-4" /> Complete Setup
                    </Button>
                )}
            </div>
        </div>
    </div>
  );
}