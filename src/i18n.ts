/**
 * i18n.ts
 * 
 * Simple internationalization support for OpenFilm.
 * Supports English and Chinese languages.
 * Detects user preference from browser settings.
 */

// ============================================================================
// LANGUAGE DETECTION
// ============================================================================

export type Language = 'en' | 'zh';

const DEFAULT_LANGUAGE: Language = 'en';

/**
 * Detect user's preferred language from browser settings
 */
export function detectLanguage(): Language {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
    
    const browserLang = navigator.language || '';
    if (browserLang.startsWith('zh')) return 'zh';
    if (browserLang.startsWith('en')) return 'en';
    
    // Check localStorage for saved preference
    const saved = localStorage.getItem('openfilm-language');
    if (saved === 'zh' || saved === 'en') return saved;
    
    return DEFAULT_LANGUAGE;
}

/**
 * Get current language
 */
let currentLang: Language = DEFAULT_LANGUAGE;

export function getLanguage(): Language {
    return currentLang;
}

/**
 * Set current language
 */
export function setLanguage(lang: Language): void {
    currentLang = lang;
    if (typeof window !== 'undefined') {
        localStorage.setItem('openfilm-language', lang);
    }
}

// ============================================================================
// TRANSLATIONS
// ============================================================================

interface Translations {
    [key: string]: string;
    // General
    loading: string;
    error: string;
    success: string;
    cancel: string;
    confirm: string;
    save: string;
    delete: string;
    new: string;
    edit: string;
    copy: string;
    duplicate: string;
    createAsset: string;
    processing: string;
    refresh: string;
    audio: string;
    comingSoon: string;
    seedanceComplianceLibrary: string;
    recordNewRealPerson: string;
    startVerification: string;
    portraitNotVerified: string;
    
    // Workflow Panel
    myWorkflows: string;
    publicWorkflows: string;
    noWorkflowsFound: string;
    noPublicWorkflows: string;
    publicWorkflowsHint: string;
    nodes: string;
    untitled: string;
    deleteWorkflow: string;
    confirmDelete: string;
    editCover: string;
    selectCoverImage: string;
    noImagesAvailable: string;
    generateImagesFirst: string;
    loadingMore: string;
    public: string;
    
// Chat Panel
        greeting: string;
        lookingForInspiration: string;
        dropMediaHint: string;
        gotIt: string;
        startInspiration: string;
        chatHistory: string;
        noChatHistory: string;
        startConversationHint: string;
        newChat: string;
        imageIdeas: string;
        yesterday: string;
        daysAgo: string;
        
        // Toolbar
        myWorkflowsTitle: string;
        projects: string;
        assets: string;
        history: string;
        tools: string;
        importTikTok: string;
        downloadWithoutWatermark: string;
        storyboardGenerator: string;
        createScenesWithAI: string;
        projectsTitle: string;
        newProject: string;
        createProject: string;
        createNewProject: string;
        editProject: string;
        projectTitleLabel: string;
        projectDescriptionLabel: string;
        noProjectsYet: string;
        createFirstProjectHint: string;
        updatedAtPrefix: string;
        searchProjectsPlaceholder: string;
        showAll: string;
        gridView: string;
        listView: string;
        import: string;
        projectNamePlaceholder: string;
        projectDescriptionPlaceholder: string;
        justNow: string;
        minutesAgo: string;
        hoursAgo: string;
        collaboration: string;
        collaborationTitle: string;
        collaborationTabUsers: string;
        collaborationTabChat: string;
        collaborationTabInvite: string;
        collaborationNoOtherUsers: string;
        collaborationTypeMessage: string;
        collaborationSend: string;
        collaborationInviteTitle: string;
        collaborationInviteDesc: string;
        collaborationPermissionLevel: string;
        collaborationRoleOwner: string;
        collaborationRoleEditor: string;
        collaborationRoleViewer: string;
        collaborationRoleMember: string;
        collaborationEditorDesc: string;
        collaborationViewerDesc: string;
        collaborationInviteLink: string;
        collaborationGenerateLink: string;
        collaborationCopy: string;
        collaborationCopied: string;
        collaborationShare: string;
        collaborationAnyoneCanJoinAs: string;
        collaborationUserJoined: string;
        collaborationUserLeft: string;
        authTitleUserCenter: string;
        authTitleLogin: string;
        authTitleRegister: string;
        authWelcomeBack: string;
        authLoginSubtitle: string;
        authRegisterSubtitle: string;
        authUsername: string;
        authUsernamePlaceholder: string;
        authEmail: string;
        authEmailPlaceholder: string;
        authPassword: string;
        authPasswordPlaceholder: string;
        authConfirmPassword: string;
        authConfirmPasswordPlaceholder: string;
        authPasswordMismatch: string;
        authPasswordMinLength: string;
        authOperationFailed: string;
        authNetworkError: string;
        authCreditsBalance: string;
        authSubscriptionFree: string;
        authSubscriptionBasic: string;
        authSubscriptionPro: string;
        authSubscriptionEnterprise: string;
        authSubscriptionAndCredits: string;
        authAdminPanel: string;
        authLogout: string;
        authSwitchToRegister: string;
        authSwitchToLogin: string;
        portraitAssets: string;
        selectPortraitAsset: string;
        noPortraitAssets: string;
        deleteConfirmProject: string;
        
        // Storyboard Generator
        characters: string;
        story: string;
        scripts: string;
        preview: string;
        generate: string;
        readyToGenerate: string;
        addCharacter: string;
        characterName: string;
        addScene: string;
        sceneDescription: string;
        generateScript: string;
        regenerateScript: string;
        selectedCharacters: string;
        noCharactersSelected: string;
        next: string;
        back: string;
        createSceneNodes: string;
        categoryAll: string;
        categoryPeople: string;
        categoryScenes: string;
        categoryObjects: string;
        selectCharactersTip: string;
        enterStoryTip: string;
        reviewScriptsTip: string;
        previewCompositeTip: string;
        generateCompositeTip: string;
        generateSceneNodes: string;
        editScript: string;
        scriptPlaceholder: string;
        compositePreview: string;
        generatingPreview: string;
        clickToRegenerate: string;
        selectedCount: string;
        brainstormStory: string;
        optimizingStory: string;
        selectModel: string;
        generateCharacter: string;
        
        // Asset Library Panel
        assetLibrary: string;
        noAssetsInCategory: string;
        deleteAsset: string;
        deleteConfirm: string;
        yes: string;
        no: string;
        deleteAssetTooltip: string;
        categoryCharacter: string;
        categoryScene: string;
        categoryItem: string;
        categoryStyle: string;
        categorySoundEffect: string;
        categoryOthers: string;
        
        // History Panel
        imageHistory: string;
        videoHistory: string;
        noImagesFound: string;
        noVideosFound: string;
        generatedImagesAppearHere: string;
        generatedVideosAppearHere: string;
        deleteAssetTitle: string;
        deleteAssetConfirm: string;
        
        // Storyboard Modal
        chooseReferenceImages: string;
        categoryLabel: string;
        itemsCount: string;
        noImagesInLibrary: string;
        addImageAssetsTip: string;
        noImagesInCategory: string;
        tryDifferentCategory: string;
        clickToMentionTip: string;
        numberOfScenes: string;
        brainstormWithAI: string;
        brainstorming: string;
        letAIWriteStory: string;
        tipBeDescriptive: string;
        optimizeWithAI: string;
        AIgeneratedScenes: string;
        creatingScene: string;
        sceneLabel: string;
        creatingStoryboard: string;
        determineFinalOutput: string;
        summary: string;
        charactersLabel: string;
        noneSelected: string;
        scenesLabel: string;
        modelLabel: string;
        previewLabel: string;
        generated: string;
        notAvailable: string;
        imagesOptional: string;
        selectReferenceTip: string;
        onceUponATime: string;
        
        // NodeControls
        promptOptional: string;
        expand: string;
        shrink: string;
        frameToFrame: string;
        motionControl: string;
        advancedSettings: string;
        noFaceDetected: string;
        noFaceDetectedHint: string;
        cannotGenerateNoFace: string;
        prompt: string;
        aspectRatio: string;
        resolution: string;
        duration: string;
        model: string;
        quality: string;
        loadingModels: string;
        noModelsFound: string;
        addModelFilesTip: string;
        zoom: string;

    // Reference settings (Kling V1.5)
    referenceSettings: string;

    // Models
    videoModels: string;
    imageModels: string;
    modelProvider: string;
    recommended: string;
    
    // Video generation
    textToVideo: string;
    imageToVideo: string;
    
    // Settings
    advanced: string;
    
    // API Keys
    apiKeyRequired: string;
    apiKeyNotConfigured: string;
    configureApiKey: string;
    
    // UI Elements
    switchToDayMode: string;
    switchToNightMode: string;
    unsavedChanges: string;
    saveBeforeNew: string;
    discard: string;
    autoSaved: string;
    
    // Model names (for display)
    veo31: string;
    klingV21: string;
    hailuo23: string;
    seedance20: string;
    seedance20Fast: string;
    seedance15Pro: string;
        seedance10Pro: string;
    seedance10Lite: string;

    // Context Menu & Nodes
    upload: string;
    addAssets: string;
    addNodes: string;
    undo: string;
    redo: string;
    paste: string;
    generateFromNode: string;
    textGeneration: string;
    text: string;
    writeOwnContent: string;
    textToImage: string;
    imageToImage: string;
    tryTo: string;
    inputFrame: string;
    generating: string;
    readyToAnimate: string;
    waitingForInput: string;
    selectModelEnterPrompt: string;
    imageGeneration: string;
    image: string;
    videoGeneration: string;
    video: string;
    videoEditor: string;
    localModelsOpenSource: string;
    localImageModel: string;
    localVideoModel: string;
    useDownloadedOpenSourceModels: string;
    animateDiffSvdMore: string;
    scriptAdcopyBrandText: string;
    promotionalImagePosterCover: string;
    
    // Create Asset
    addToExisting: string;
    coverLabel: string;
    nameLabel: string;
    assetNamePlaceholder: string;
    create: string;
    saving: string;
    saved: string;
    failed: string;
    writeTextPlaceholder: string;
    shrinkTextArea: string;
    expandTextArea: string;

    // Seedance Prompt Helper
    seedancePromptHelper: string;
    shotType: string;
    motion: string;
    styleLighting: string;
    clearPrompt: string;
    seedancePromptTip: string;

    // Reference Images
    referenceImages: string;
    firstFrame: string;
    endFrame: string;
    styleReference: string;
    clear: string;

    // Toggle labels
    seed: string;
    fixedCamera: string;
    generateAudio: string;
    watermark: string;
    returnLastFrame: string;
}

const translations: Record<Language, Translations> = {
    en: {
        // General
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        confirm: 'Confirm',
        save: 'Save',
        delete: 'Delete',
        new: 'New',
        edit: 'Edit',
        copy: 'Copy',
        duplicate: 'Duplicate',
        createAsset: 'Create Asset',
        processing: 'Processing...',
        refresh: 'Refresh',
        audio: 'Audio',
        comingSoon: 'Coming soon',
        seedanceComplianceLibrary: 'Seedance 2.0 Compliance Library',
        recordNewRealPerson: 'Add a new real person',
        startVerification: 'Start verification',
        portraitNotVerified: 'Not verified',
        selectedCount: 'Selected',
        
        // Workflow Panel
        myWorkflows: 'My Workflows',
        publicWorkflows: 'Public Workflows',
        noWorkflowsFound: 'No workflows found',
        noPublicWorkflows: 'No public workflows available',
        publicWorkflowsHint: 'Add workflow JSONs to public/workflows/',
        nodes: 'nodes',
        untitled: 'Untitled',
        deleteWorkflow: 'Delete Workflow',
        confirmDelete: 'Are you sure you want to delete this workflow? This action cannot be undone.',
        editCover: 'Edit cover',
        selectCoverImage: 'Select Cover Image',
        noImagesAvailable: 'No images available',
        generateImagesFirst: 'Generate some images first!',
        loadingMore: 'Loading more...',
        public: 'PUBLIC',
        
        // Chat Panel
        greeting: 'Hi,',
        lookingForInspiration: 'Looking for inspiration?',
        dropMediaHint: 'Drop image/video here',
        gotIt: 'Got it',
        startInspiration: 'Start your journey of inspiration',
        chatHistory: 'Chat History',
        noChatHistory: 'No chat history yet',
        startConversationHint: 'Start a conversation to see it here',
        newChat: 'New Chat',
        imageIdeas: 'ImageIdeas',
        yesterday: 'Yesterday',
        daysAgo: 'days ago',
        
        // Toolbar
        myWorkflowsTitle: 'My Workflows',
        projects: 'Projects',
        assets: 'Assets',
        history: 'History',
        tools: 'Tools',
        importTikTok: 'Import TikTok',
        downloadWithoutWatermark: 'Download without watermark',
        storyboardGenerator: 'Storyboard Generator',
        createScenesWithAI: 'Create scenes with AI',
        projectsTitle: 'My Projects',
        newProject: 'New Project',
        createProject: 'Create Project',
        createNewProject: 'Create New Project',
        editProject: 'Edit Project',
        projectTitleLabel: 'Project Title',
        projectDescriptionLabel: 'Description',
        noProjectsYet: 'No projects yet',
        createFirstProjectHint: 'Create your first project to get started',
        updatedAtPrefix: 'Updated',
        searchProjectsPlaceholder: 'Search projects',
        showAll: 'Show all',
        gridView: 'Grid view',
        listView: 'List view',
        import: 'Import',
        projectNamePlaceholder: 'My Awesome Project',
        projectDescriptionPlaceholder: 'Optional description...',
        justNow: 'just now',
        minutesAgo: 'min ago',
        hoursAgo: 'hours ago',
        collaboration: 'Collaboration',
        collaborationTitle: 'Collaboration',
        collaborationTabUsers: 'Users',
        collaborationTabChat: 'Chat',
        collaborationTabInvite: 'Invite',
        collaborationNoOtherUsers: 'No other users online',
        collaborationTypeMessage: 'Type a message...',
        collaborationSend: 'Send',
        collaborationInviteTitle: 'Invite Collaborators',
        collaborationInviteDesc: 'Share this link to invite others to collaborate on this project.',
        collaborationPermissionLevel: 'Permission Level',
        collaborationRoleOwner: 'Owner',
        collaborationRoleEditor: 'Editor',
        collaborationRoleViewer: 'Viewer',
        collaborationRoleMember: 'Member',
        collaborationEditorDesc: 'Can edit nodes, add connections, and chat',
        collaborationViewerDesc: 'Can view the project and chat only',
        collaborationInviteLink: 'Invite Link',
        collaborationGenerateLink: 'Click to generate link...',
        collaborationCopy: 'Copy',
        collaborationCopied: 'Copied!',
        collaborationShare: 'Share',
        collaborationAnyoneCanJoinAs: 'Anyone with this link can join as {role}',
        collaborationUserJoined: '{name} joined the project',
        collaborationUserLeft: '{name} left the project',
        authTitleUserCenter: 'User Center',
        authTitleLogin: 'Login',
        authTitleRegister: 'Register',
        authWelcomeBack: 'Welcome back, {name}',
        authLoginSubtitle: 'Welcome back, please login to your account',
        authRegisterSubtitle: 'Create a new account to get started',
        authUsername: 'Username',
        authUsernamePlaceholder: 'Enter username',
        authEmail: 'Email',
        authEmailPlaceholder: 'Enter email',
        authPassword: 'Password',
        authPasswordPlaceholder: 'Enter password',
        authConfirmPassword: 'Confirm Password',
        authConfirmPasswordPlaceholder: 'Enter password again',
        authPasswordMismatch: 'Passwords do not match',
        authPasswordMinLength: 'Password must be at least 6 characters',
        authOperationFailed: 'Operation failed',
        authNetworkError: 'Network error, please try again',
        authCreditsBalance: 'Credits Balance',
        authSubscriptionFree: 'Free',
        authSubscriptionBasic: 'Basic',
        authSubscriptionPro: 'Pro',
        authSubscriptionEnterprise: 'Enterprise',
        authSubscriptionAndCredits: 'Subscription & Credits',
        authAdminPanel: 'Admin Panel',
        authLogout: 'Logout',
        authSwitchToRegister: "Don't have an account? Register",
        authSwitchToLogin: 'Already have an account? Login',
        portraitAssets: 'Portrait Assets',
        portraitAssetLibrary: 'Portrait Asset Library',
        managePortraitAssets: 'Manage Portrait Assets',
        manage: 'Manage',
        selectPortraitAsset: 'Select portrait asset',
        noPortraitAssets: 'No portrait assets',
        deleteConfirmProject: 'Are you sure you want to delete this project?',
        authenticationFailed: 'Authentication failed',
        verificationFailed: 'Verification failed',
        
        // Storyboard Generator
        characters: 'Characters',
        story: 'Story',
        scripts: 'Scripts',
        preview: 'Preview',
        generate: 'Generate',
        readyToGenerate: 'Ready to Generate',
        addCharacter: 'Add Character',
        characterName: 'Character Name',
        addScene: 'Add Scene',
        sceneDescription: 'Scene Description',
        generateScript: 'Generate Script',
        regenerateScript: 'Regenerate',
        selectedCharacters: 'Selected Characters',
        noCharactersSelected: 'No characters selected',
        next: 'Next',
        back: 'Back',
        createSceneNodes: 'Create Scene Nodes',
        categoryAll: 'All',
        categoryPeople: 'People',
        categoryScenes: 'Scenes',
        categoryObjects: 'Objects',
        selectCharactersTip: 'Select characters from your library to include in your story',
        enterStoryTip: 'Enter your story idea below, or use AI to brainstorm',
        reviewScriptsTip: 'Review and edit the generated scene scripts',
        previewCompositeTip: 'Preview how your storyboard will look',
        generateCompositeTip: 'Generate a composite preview of all scenes',
        generateSceneNodes: 'Generate Scene Nodes',
        editScript: 'Edit',
        scriptPlaceholder: 'Describe what happens in this scene...',
        compositePreview: 'Composite Preview',
        generatingPreview: 'Generating preview...',
        clickToRegenerate: 'Click to regenerate',
        brainstormStory: 'Brainstorm Story',
        optimizingStory: 'Optimizing...',
        selectModel: 'Select Model',
        generateCharacter: 'Generate Character',
        
        // Asset Library Panel
        assetLibrary: 'Asset Library',
        noAssetsInCategory: 'No assets found in this category.',
        deleteAsset: 'Delete Asset',
        deleteConfirm: 'Delete?',
        yes: 'Yes',
        no: 'No',
        deleteAssetTooltip: 'Delete Asset',
        categoryCharacter: 'Character',
        categoryScene: 'Scene',
        categoryItem: 'Item',
        categoryStyle: 'Style',
        categorySoundEffect: 'Sound Effect',
        categoryOthers: 'Others',
        
        // History Panel
        imageHistory: 'Image History',
        videoHistory: 'Video History',
        noImagesFound: 'No images found',
        noVideosFound: 'No videos found',
        generatedImagesAppearHere: 'Generated images will appear here',
        generatedVideosAppearHere: 'Generated videos will appear here',
        deleteAssetTitle: 'Delete Asset',
        deleteAssetConfirm: 'Are you sure you want to delete this {type}? This action cannot be undone.',
        
        // Storyboard Modal
        chooseReferenceImages: 'Choose up to 3 reference images from your Asset Library to guide the AI.',
        categoryLabel: 'Category:',
        itemsCount: 'items',
        noImagesInLibrary: 'No images found in Asset Library',
        addImageAssetsTip: 'Add image assets to your library to use them as character references',
        noImagesInCategory: 'No images in this category',
        tryDifferentCategory: 'Try selecting a different category',
        clickToMentionTip: 'selected — click to insert @mention in story:',
        numberOfScenes: 'Number of Scenes:',
        brainstormWithAI: 'Brainstorm with AI',
        brainstorming: 'Brainstorming...',
        letAIWriteStory: '(let AI write a story for you)',
        tipBeDescriptive: 'Tip: Be descriptive about scenes, actions, and emotions for better results.',
        optimizeWithAI: 'Optimize with AI',
        AIgeneratedScenes: 'AI generated {count} scene scripts. Click to edit.',
        creatingScene: 'Creating Scene {num}...',
        sceneLabel: 'Scene',
        creatingStoryboard: 'Creating a cohesive storyboard with Nano Banana Pro',
        determineFinalOutput: 'Determine the final output. The individual scenes will be extracted from your preview image.',
        summary: 'Summary',
        charactersLabel: 'Characters:',
        noneSelected: 'None selected',
        scenesLabel: 'Scenes:',
        modelLabel: 'Model:',
        previewLabel: 'Preview:',
        generated: 'Generated',
        notAvailable: 'Not available',
        imagesOptional: '/3 images (optional)',
        selectReferenceTip: 'Select reference (↑↓ to navigate, Enter to select)',
        onceUponATime: "Once upon a time, in a magical forest...",
        
        // NodeControls
        promptOptional: 'Prompt optional...',
        expand: 'Expand',
        shrink: 'Shrink',
        frameToFrame: 'Frame-to-Frame',
        motionControl: 'Motion Control',
        advancedSettings: 'Advanced Settings',
        noFaceDetected: 'No face detected',
        noFaceDetectedHint: 'Please use a reference image with a clearer face.',
        cannotGenerateNoFace: 'Cannot generate: No face detected in reference image',
        prompt: 'Prompt',
        aspectRatio: 'Aspect Ratio',
        resolution: 'Resolution',
        duration: 'Duration',
        model: 'Model',
        quality: 'Quality',
        referenceSettings: 'Reference Settings',
        loadingModels: 'Loading models...',
        noModelsFound: 'No models found',
        addModelFilesTip: 'Add .safetensors files to models/',
        zoom: 'Zoom',
        
        // TikTok Import Modal
        importTikTokVideo: 'Import TikTok Video',
        tiktokVideoUrl: 'TikTok Video URL',
        pasteTikTokUrlPlaceholder: 'Paste TikTok video URL here (Ctrl+V)',
        supportedTikTokLinks: 'Supports tiktok.com, vm.tiktok.com, and vt.tiktok.com links',
        tryAgain: 'Try again',
        downloadingVideo: 'Downloading video...',
        mayTakeAMoment: 'This may take a moment',
        videoDownloadedSuccessfully: 'Video downloaded successfully!',
        addToCanvas: 'Add to Canvas',
        importing: 'Importing...',
        importVideo: 'Import Video',
        
        // Storyboard Video Modal
        createStoryVideos: 'Create Story Videos',
        generateVideoClipsForEachScene: 'Generate video clips for each scene',
        noScenesAvailable: 'No scenes available or all selected scenes removed.',
        removeScene: 'Remove scene',
        noImage: 'No Image',
        scene: 'Scene',
        videoPrompt: 'Video Prompt',
        enhancePromptWithAI: 'Enhance your prompt with AI',
        describeMotionPlaceholder: "Describe the motion for this scene (e.g., 'Slow pan right, character smiles')...",
        autoGenerate: 'Auto-Generate',
        estimatedCost: 'Est. cost',
        credits: 'credits',
        generateStoryVideos: 'Generate Story Videos',
        google: 'Google',
        klingAI: 'Kling AI',
        hailuoAI: 'Hailuo AI',
        
        // Image Editor & Drawing Tools
        imageEditor: 'Image Editor',
        exitImageEditor: 'Exit Image Editor',
        noImageLoaded: 'No image loaded',
        failedToLoad: 'Failed to load',
        brush: 'Brush',
        eraser: 'Eraser',
        brushWidth: 'Brush Width',
        presetColors: 'Preset Colors',
        customColor: 'Custom Color',
        eraserWidth: 'Eraser Width',
        
        // Context Menu & Nodes
        upload: 'Upload',
        addAssets: 'Add Assets',
        addNodes: 'Add Nodes',
        undo: 'Undo',
        redo: 'Redo',
        paste: 'Paste',
        generateFromNode: 'Generate from this node',
        textGeneration: 'Text Generation',
        text: 'Text',
        writeOwnContent: 'Write your own',
        textToImage: 'Text to Image',
        imageToImage: 'Image to Image',
        tryTo: 'Try to:',
        inputFrame: 'Input Frame',
        generating: 'Generating...',
        readyToAnimate: 'Ready to animate',
        waitingForInput: 'Waiting for input...',
        selectModelEnterPrompt: 'Select a model and enter prompt',
        imageGeneration: 'Image Generation',
        image: 'Image',
        videoGeneration: 'Video Generation',
        video: 'Video',
        videoEditor: 'Video Editor',
        localModelsOpenSource: 'Local Models (Open Source)',
        localImageModel: 'Local Image Model',
        localVideoModel: 'Local Video Model',
        useDownloadedOpenSourceModels: 'Use downloaded open-source models',
        animateDiffSvdMore: 'AnimateDiff, SVD, and more',
        scriptAdcopyBrandText: 'Script, Ad copy, Brand text',
        promotionalImagePosterCover: 'Promotional image, poster, cover',
        
        // Create Asset
        addToExisting: 'Add to Existing',
        coverLabel: 'Cover',
        nameLabel: 'Name',
        assetNamePlaceholder: 'Asset Name',
        create: 'Create',
        saving: 'Saving...',
        saved: 'Saved!',
        failed: 'Failed',
        writeTextPlaceholder: 'Write your text here...',
        shrinkTextArea: 'Shrink text area',
        expandTextArea: 'Expand text area',
        
        // Models
        videoModels: 'Video Models',
        imageModels: 'Image Models',
        modelProvider: 'Provider',
        recommended: 'Recommended',
        
        // Video generation
        textToVideo: 'Text → Video',
        imageToVideo: 'Image → Video',
        
        // Settings
        advanced: 'Advanced',
        
        // API Keys
        apiKeyRequired: 'API key is required',
        apiKeyNotConfigured: 'API key not configured',
        configureApiKey: 'Configure API Key',
        
        // UI Elements
        switchToDayMode: 'Switch to Day Mode',
        switchToNightMode: 'Switch to Night Mode',
        unsavedChanges: 'Unsaved Changes',
        saveBeforeNew: 'You have unsaved changes. Would you like to save before creating a new canvas?',
        discard: 'Discard',
        autoSaved: 'Auto-saved',
        
        // Model names
        veo31: 'Veo 3.1',
        klingV21: 'Kling V2.1',
        hailuo23: 'Hailuo 2.3',
        seedance20: 'Seedance 2.0',
        seedance20Fast: 'Seedance 2.0 Fast',
        seedance15Pro: 'Seedance 1.5 Pro',
        seedance10Pro: 'Seedance 1.0 Pro',
        seedance10Lite: 'Seedance 1.0 Lite',

        // Seedance Prompt Helper
        seedancePromptHelper: 'Seedance Prompt Helper',
        shotType: 'Shot Type',
        motion: 'Motion',
        styleLighting: 'Style & Lighting',
        clearPrompt: 'Clear Prompt',
        seedancePromptTip: 'Tip: Recommended structure → Subject + Motion + Scene + Shot + Style',

        // Reference Images
        referenceImages: 'Reference Images',
        firstFrame: 'First Frame',
        endFrame: 'End Frame',
        styleReference: 'Style Reference',
        clear: 'Clear',

        // Toggle labels
        seed: 'Seed',
        fixedCamera: 'Fixed Camera',
        generateAudio: 'Generate Audio',
        watermark: 'Watermark',
        returnLastFrame: 'Return Last Frame',
    },
    zh: {
        // General
        loading: '加载中...',
        error: '错误',
        success: '成功',
        cancel: '取消',
        confirm: '确认',
        save: '保存',
        delete: '删除',
        new: '新建',
        edit: '编辑',
        copy: '复制',
        duplicate: '复制一份',
        createAsset: '创建素材',
        processing: '处理中...',
        refresh: '刷新',
        audio: '音频',
        comingSoon: '敬请期待',
        seedanceComplianceLibrary: 'Seedance 2.0 合规素材库',
        recordNewRealPerson: '录入新的真人',
        startVerification: '开始认证',
        portraitNotVerified: '未完成认证',
        selectedCount: '已选',
        
        // Workflow Panel
        myWorkflows: '我的工作流',
        publicWorkflows: '公开工作流',
        noWorkflowsFound: '暂无工作流',
        noPublicWorkflows: '暂无公开工作流',
        publicWorkflowsHint: '请将工作流 JSON 添加到 public/workflows/',
        nodes: '个节点',
        untitled: '未命名',
        deleteWorkflow: '删除工作流',
        confirmDelete: '确定要删除这个工作流吗？此操作无法撤销。',
        editCover: '编辑封面',
        selectCoverImage: '选择封面图片',
        noImagesAvailable: '暂无可用图片',
        generateImagesFirst: '请先生成一些图片！',
        loadingMore: '加载更多...',
        public: '公开',
        
        // Chat Panel
        greeting: '你好，',
        lookingForInspiration: '寻找灵感？',
        dropMediaHint: '拖放图片/视频到此处',
        gotIt: '知道了',
        startInspiration: '开始你的灵感之旅',
        chatHistory: '聊天记录',
        noChatHistory: '暂无聊天记录',
        startConversationHint: '开始对话后会在这里显示',
        newChat: '新对话',
        imageIdeas: '图片灵感',
        yesterday: '昨天',
        daysAgo: '天前',
        
        // Toolbar
        myWorkflowsTitle: '我的工作流',
        projects: '项目',
        assets: '素材库',
        history: '历史',
        tools: '工具',
        importTikTok: '导入 TikTok',
        downloadWithoutWatermark: '无水印下载',
        storyboardGenerator: '故事板生成器',
        createScenesWithAI: '用AI创建场景',
        projectsTitle: '我的项目',
        newProject: '新建项目',
        createProject: '创建项目',
        createNewProject: '创建新项目',
        editProject: '编辑项目',
        projectTitleLabel: '项目名称',
        projectDescriptionLabel: '描述',
        noProjectsYet: '暂无项目',
        createFirstProjectHint: '创建你的第一个项目开始使用',
        updatedAtPrefix: '更新于',
        searchProjectsPlaceholder: '搜索项目',
        showAll: '显示全部',
        gridView: '网格视图',
        listView: '列表视图',
        import: '导入',
        projectNamePlaceholder: '我的项目',
        projectDescriptionPlaceholder: '可选描述...',
        justNow: '刚刚',
        minutesAgo: '分钟前',
        hoursAgo: '小时前',
        collaboration: '协作',
        collaborationTitle: '协作',
        collaborationTabUsers: '成员',
        collaborationTabChat: '聊天',
        collaborationTabInvite: '邀请',
        collaborationNoOtherUsers: '暂无其他在线成员',
        collaborationTypeMessage: '输入消息...',
        collaborationSend: '发送',
        collaborationInviteTitle: '邀请协作者',
        collaborationInviteDesc: '分享链接邀请他人加入并协作。',
        collaborationPermissionLevel: '权限级别',
        collaborationRoleOwner: '拥有者',
        collaborationRoleEditor: '可编辑',
        collaborationRoleViewer: '只读',
        collaborationRoleMember: '成员',
        collaborationEditorDesc: '可编辑节点、添加连线并参与聊天',
        collaborationViewerDesc: '仅可查看并参与聊天',
        collaborationInviteLink: '邀请链接',
        collaborationGenerateLink: '点击生成链接...',
        collaborationCopy: '复制',
        collaborationCopied: '已复制！',
        collaborationShare: '分享',
        collaborationAnyoneCanJoinAs: '任何拥有此链接的人都可以以 {role} 身份加入',
        collaborationUserJoined: '{name} 加入了项目',
        collaborationUserLeft: '{name} 离开了项目',
        authTitleUserCenter: '用户中心',
        authTitleLogin: '登录',
        authTitleRegister: '注册',
        authWelcomeBack: '欢迎回来，{name}',
        authLoginSubtitle: '欢迎回来，请登录您的账号',
        authRegisterSubtitle: '创建新账号开始使用',
        authUsername: '用户名',
        authUsernamePlaceholder: '请输入用户名',
        authEmail: '邮箱',
        authEmailPlaceholder: '请输入邮箱',
        authPassword: '密码',
        authPasswordPlaceholder: '请输入密码',
        authConfirmPassword: '确认密码',
        authConfirmPasswordPlaceholder: '请再次输入密码',
        authPasswordMismatch: '两次输入的密码不一致',
        authPasswordMinLength: '密码长度至少6个字符',
        authOperationFailed: '操作失败',
        authNetworkError: '网络错误，请重试',
        authCreditsBalance: '积分余额',
        authSubscriptionFree: '免费版',
        authSubscriptionBasic: '基础版',
        authSubscriptionPro: '专业版',
        authSubscriptionEnterprise: '企业版',
        authSubscriptionAndCredits: '订阅与积分',
        authAdminPanel: '管理后台',
        authLogout: '退出登录',
        authSwitchToRegister: '还没有账号？立即注册',
        authSwitchToLogin: '已有账号？立即登录',
        portraitAssets: '真人人像资产',
        portraitAssetLibrary: '真人人像资产库',
        managePortraitAssets: '管理真人人像资产',
        manage: '管理',
        selectPortraitAsset: '选择真人人像素材',
        noPortraitAssets: '暂无真人人像素材',
        deleteConfirmProject: '确定要删除这个项目吗？',
        authenticationFailed: '认证失败',
        verificationFailed: '认证失败',
        
        // Storyboard Generator
        characters: '角色',
        story: '故事',
        scripts: '脚本',
        preview: '预览',
        generate: '生成',
        readyToGenerate: '准备生成',
        addCharacter: '添加角色',
        characterName: '角色名称',
        addScene: '添加场景',
        sceneDescription: '场景描述',
        generateScript: '生成脚本',
        regenerateScript: '重新生成',
        selectedCharacters: '已选角色',
        noCharactersSelected: '未选择角色',
        next: '下一步',
        back: '返回',
        createSceneNodes: '创建场景节点',
        categoryAll: '全部',
        categoryPeople: '人物',
        categoryScenes: '场景',
        categoryObjects: '物体',
        selectCharactersTip: '从素材库中选择角色添加到故事中',
        enterStoryTip: '在下方输入您的故事想法，或使用AI辅助创作',
        reviewScriptsTip: '审核并编辑生成的场景脚本',
        previewCompositeTip: '预览故事板的整体效果',
        generateCompositeTip: '生成所有场景的合成预览图',
        generateSceneNodes: '生成场景节点',
        editScript: '编辑',
        scriptPlaceholder: '描述这个场景中发生的事情...',
        compositePreview: '合成预览',
        generatingPreview: '正在生成预览...',
        clickToRegenerate: '点击重新生成',
        brainstormStory: '故事灵感',
        optimizingStory: '优化中...',
        selectModel: '选择模型',
        generateCharacter: '生成角色',
        
        // Asset Library Panel
        assetLibrary: '素材库',
        noAssetsInCategory: '此分类暂无素材。',
        deleteAsset: '删除素材',
        deleteConfirm: '确定删除？',
        yes: '是',
        no: '否',
        deleteAssetTooltip: '删除素材',
        categoryCharacter: '角色',
        categoryScene: '场景',
        categoryItem: '物品',
        categoryStyle: '风格',
        categorySoundEffect: '音效',
        categoryOthers: '其他',
        
        // History Panel
        imageHistory: '图片历史',
        videoHistory: '视频历史',
        noImagesFound: '暂无图片',
        noVideosFound: '暂无视频',
        generatedImagesAppearHere: '生成的图片将显示在这里',
        generatedVideosAppearHere: '生成的视频将显示在这里',
        deleteAssetTitle: '删除素材',
        deleteAssetConfirm: '确定要删除这个{type}吗？此操作无法撤销。',
        
        // Storyboard Modal
        chooseReferenceImages: '从素材库中选择最多3张参考图片来引导AI。',
        categoryLabel: '分类：',
        itemsCount: '项',
        noImagesInLibrary: '素材库中暂无图片',
        addImageAssetsTip: '将图片素材添加到素材库中作为角色参考',
        noImagesInCategory: '此分类暂无图片',
        tryDifferentCategory: '尝试选择其他分类',
        clickToMentionTip: '已选 - 点击在故事中插入@提及：',
        numberOfScenes: '场景数量：',
        brainstormWithAI: 'AI灵感创作',
        brainstorming: '灵感创作中...',
        letAIWriteStory: '（让AI为你写一个故事）',
        tipBeDescriptive: '提示：描述场景、动作和情感可以获得更好的效果。',
        optimizeWithAI: 'AI优化',
        AIgeneratedScenes: 'AI生成了{count}个场景脚本。点击编辑。',
        creatingScene: '正在创建场景 {num}...',
        sceneLabel: '场景',
        creatingStoryboard: '正在创建连贯的故事板',
        determineFinalOutput: '确定最终输出。单个场景将从预览图中提取。',
        summary: '摘要',
        charactersLabel: '角色：',
        noneSelected: '未选择',
        scenesLabel: '场景：',
        modelLabel: '模型：',
        previewLabel: '预览：',
        generated: '已生成',
        notAvailable: '不可用',
        imagesOptional: '/3张图片（可选）',
        selectReferenceTip: '选择参考（↑↓ 导航，Enter 确认）',
        onceUponATime: '从前，在一个神奇的森林里...',
        
        // NodeControls
        promptOptional: '可选输入提示词...',
        expand: '展开',
        shrink: '收起',
        frameToFrame: '首尾帧',
        motionControl: '动作控制',
        advancedSettings: '高级设置',
        noFaceDetected: '未检测到人脸',
        noFaceDetectedHint: '请使用包含更清晰人脸的参考图片。',
        cannotGenerateNoFace: '无法生成：参考图片中未检测到人脸',
        prompt: '提示词',
        aspectRatio: '宽高比',
        resolution: '分辨率',
        duration: '时长',
        model: '模型',
        quality: '质量',
        referenceSettings: '参考设置',
        loadingModels: '加载模型中...',
        noModelsFound: '未找到模型',
        addModelFilesTip: '将 .safetensors 文件添加到 models/ 目录',
        zoom: '缩放',
        
        // Models
        videoModels: '视频模型',
        imageModels: '图像模型',
        modelProvider: '提供商',
        recommended: '推荐',
        
        // Video generation
        textToVideo: '文字转视频',
        imageToVideo: '图像转视频',
        
        // Settings
        advanced: '高级',
        
        // API Keys
        apiKeyRequired: '需要API密钥',
        apiKeyNotConfigured: '未配置API密钥',
        configureApiKey: '配置API密钥',
        
        // UI Elements
        switchToDayMode: '切换日间模式',
        switchToNightMode: '切换夜间模式',
        unsavedChanges: '未保存的更改',
        saveBeforeNew: '您有未保存的更改。是否在创建新画布前保存？',
        discard: '放弃',
        autoSaved: '已自动保存',
        
        // Model names
        veo31: 'Veo 3.1',
        klingV21: 'Kling V2.1',
        hailuo23: 'Hailuo 2.3',
        seedance20: 'Seedance 2.0',
        seedance20Fast: 'Seedance 2.0 快速版',
        seedance15Pro: 'Seedance 1.5 专业版',
        seedance10Pro: 'Seedance 1.0 专业版',
        seedance10Lite: 'Seedance 1.0 轻量版',

        // Context Menu & Nodes
        upload: '上传',
        addAssets: '添加素材',
        addNodes: '添加节点',
        undo: '撤销',
        redo: '重做',
        paste: '粘贴',
        generateFromNode: '从此节点生成',
        textGeneration: '文本生成',
        text: '文本',
        writeOwnContent: '自己编写',
        textToImage: '文生图',
        imageToImage: '图生图',
        tryTo: '尝试：',
        inputFrame: '输入帧',
        generating: '生成中...',
        readyToAnimate: '准备生成',
        waitingForInput: '等待输入...',
        selectModelEnterPrompt: '选择模型并输入提示词',
        imageGeneration: '图像生成',
        image: '图像',
        videoGeneration: '视频生成',
        video: '视频',
        videoEditor: '视频编辑',
        localModelsOpenSource: '本地模型（开源）',
        localImageModel: '本地图像模型',
        localVideoModel: '本地视频模型',
        useDownloadedOpenSourceModels: '使用下载的开源模型',
        animateDiffSvdMore: 'AnimateDiff, SVD 等',
        scriptAdcopyBrandText: '文案、广告语、品牌文字',
        promotionalImagePosterCover: '宣传图、海报、封面',

        // Create Asset
        addToExisting: '添加到已有',
        coverLabel: '封面',
        nameLabel: '名称',
        assetNamePlaceholder: '素材名称',
        create: '创建',
        saving: '保存中...',
        saved: '已保存！',
        failed: '失败',
        writeTextPlaceholder: '在这里输入文本...',
        shrinkTextArea: '收起输入框',
        expandTextArea: '展开输入框',

        // Seedance Prompt Helper
        seedancePromptHelper: 'Seedance 提示词助手',
        shotType: '镜头类型',
        motion: '动作',
        styleLighting: '风格 & 光影',
        clearPrompt: '清空提示词',
        seedancePromptTip: '提示：推荐结构 → 主体描述 + 动作描述 + 场景环境 + 镜头语言 + 光影风格',

        // Reference Images
        referenceImages: '参考图',
        firstFrame: '首帧',
        endFrame: '尾帧',
        styleReference: '风格参考',
        clear: '清空',

        // Toggle labels
        seed: '随机种子',
        fixedCamera: '固定相机',
        generateAudio: '生成音频',
        watermark: '添加水印',
        returnLastFrame: '返回尾帧',
    }
};

// ============================================================================
// TRANSLATION FUNCTION
// ============================================================================

/**
 * Get translation for a key
 */
export function t(key: string, lang?: Language): string {
    const language = lang || currentLang;
    return translations[language][key] || translations.en[key] || key;
}

/**
 * Initialize i18n (call on app start)
 */
export function initI18n(): void {
    currentLang = detectLanguage();
}

// ============================================================================
// MODEL DISPLAY NAMES
// ============================================================================

export const modelDisplayNames: Record<string, Record<Language, string>> = {
    // Google
    'veo-3.1': { en: 'Veo 3.1', zh: 'Veo 3.1' },
    
    // Kling AI
    'kling-v2-1': { en: 'Kling V2.1', zh: 'Kling V2.1' },
    'kling-v2-1-master': { en: 'Kling V2.1 Master', zh: 'Kling V2.1 大师版' },
    'kling-v2-5-turbo': { en: 'Kling V2.5 Turbo', zh: 'Kling V2.5 加速版' },
    'kling-v2-6': { en: 'Kling 2.6 (Motion)', zh: 'Kling 2.6 (动作控制)' },
    
    // Hailuo / MiniMax
    'hailuo-2.3': { en: 'Hailuo 2.3', zh: 'Hailuo 2.3' },
    'hailuo-2.3-fast': { en: 'Hailuo 2.3 Fast', zh: 'Hailuo 2.3 快速版' },
    'hailuo-02': { en: 'Hailuo 02', zh: 'Hailuo 02' },
    
    // OpenAI
    'gpt-image-1.5': { en: 'GPT Image 1.5', zh: 'GPT Image 1.5' },
    
    // Gemini
    'gemini-pro': { en: 'Nano Banana Pro', zh: 'Nano Banana Pro' },
    
    // Volcano / Seedance
    'seedance-2.0': { en: 'Seedance 2.0', zh: 'Seedance 2.0' },
    'seedance-2.0-fast': { en: 'Seedance 2.0 Fast', zh: 'Seedance 2.0 快速版' },
    'seedance-1.5-pro': { en: 'Seedance 1.5 Pro', zh: 'Seedance 1.5 专业版' },
    'seedance-1.0-pro': { en: 'Seedance 1.0 Pro', zh: 'Seedance 1.0 专业版' },
    'seedance-1.0-lite': { en: 'Seedance 1.0 Lite', zh: 'Seedance 1.0 轻量版' },
};

/**
 * Get localized model name
 */
export function getModelDisplayName(modelId: string, lang?: Language): string {
    const language = lang || currentLang;
    return modelDisplayNames[modelId]?.[language] || modelId;
}

// ============================================================================
// PROVIDER NAMES
// ============================================================================

export const providerNames: Record<string, Record<Language, string>> = {
    google: { en: 'Google', zh: '谷歌' },
    openai: { en: 'OpenAI', zh: 'OpenAI' },
    kling: { en: 'Kling AI', zh: 'Kling AI' },
    hailuo: { en: 'Hailuo AI', zh: 'Hailuo AI' },
    volcano: { en: 'Volcano / Seedance', zh: '火山引擎 / Seedance' },
};

/**
 * Get localized provider name
 */
export function getProviderName(provider: string, lang?: Language): string {
    const language = lang || currentLang;
    return providerNames[provider]?.[language] || provider;
}
