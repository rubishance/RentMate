class WizardController {
    constructor(config) {
        this.currentStep = 1;
        this.totalSteps = config.totalSteps || 4;
        this.containers = config.containers; // Array of step element IDs
        this.progressBar = document.getElementById(config.progressBarId);
        this.progressFill = document.getElementById(config.progressFillId);
        this.stepsIndicator = document.getElementById(config.stepsIndicatorId);

        this.btnBack = document.getElementById(config.btnBackId);
        this.btnNext = document.getElementById(config.btnNextId);
        this.btnSave = document.getElementById(config.btnSaveId);

        this.onNext = config.onNext; // Callback for validation/actions
        this.onComplete = config.onComplete;

        this.init();
    }

    init() {
        this.updateUI();
        this.setupListeners();
    }

    setupListeners() {
        if (this.btnBack) this.btnBack.addEventListener('click', () => this.back());
        if (this.btnNext) this.btnNext.addEventListener('click', () => this.next());
        if (this.btnSave) this.btnSave.addEventListener('click', () => {
            if (this.onComplete) this.onComplete();
        });
    }

    async next() {
        if (this.onNext) {
            const canProceed = await this.onNext(this.currentStep);
            if (!canProceed) return;
        }

        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.updateUI();
        }
    }

    back() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateUI();
        }
    }

    goTo(step) {
        if (step >= 1 && step <= this.totalSteps) {
            this.currentStep = step;
            this.updateUI();
        }
    }

    updateUI() {
        // Show/Hide Steps
        this.containers.forEach((id, index) => {
            const el = document.getElementById(id);
            if (el) {
                if (index + 1 === this.currentStep) {
                    el.classList.remove('hidden');
                    // Add animation class if desired
                    el.classList.add('wizard-fade-in');
                } else {
                    el.classList.add('hidden');
                    el.classList.remove('wizard-fade-in');
                }
            }
        });

        // Update Buttons
        if (this.btnBack) this.btnBack.style.display = this.currentStep === 1 ? 'none' : 'flex';

        if (this.currentStep === this.totalSteps) {
            if (this.btnNext) this.btnNext.style.display = 'none';
            if (this.btnSave) this.btnSave.style.display = 'flex';
        } else {
            if (this.btnNext) this.btnNext.style.display = 'flex';
            if (this.btnSave) this.btnSave.style.display = 'none';
        }

        // Update Progress Bar
        const percentage = ((this.currentStep - 1) / (this.totalSteps - 1)) * 100;
        if (this.progressFill) this.progressFill.style.width = `${percentage}%`;

        // Update Stepper Indicator (active class)
        if (this.stepsIndicator) {
            const steps = this.stepsIndicator.querySelectorAll('.step-dot');
            steps.forEach((step, idx) => {
                if (idx + 1 <= this.currentStep) {
                    step.classList.add('active');
                } else {
                    step.classList.remove('active');
                }
            });
        }
    }
}
