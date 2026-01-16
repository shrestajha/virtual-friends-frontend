import React, { useState } from 'react';
import { Box, Paper, Typography, Button, Checkbox, FormControlLabel, CircularProgress, Alert } from '@mui/material';
import { submitConsent } from '../api';

const CONSENT_TEXT = `Dear Participant:

I, Elham Yazdani, invite you to participate in a research study entitled Consumer Perceptions. The purpose of this study is to investigate the psychology behind consumer behavior. You must be 18 years of age or older to participate.

Your participation will involve interacting with one virtual agent. You need to interact with the agent at least two days a week for each week during the semester. Each task will take up to 10 minutes to complete. The task will require you logging in to your account on chat.mark4650.com, and then chatting with the assigned agent to you. You need to answer some questions in the same platform about your interactions with the characters, but they don't involve any personal information or any question about the content of your conversations. You need to do this task at least twice a week. Your involvement in the study is voluntary and your decision to participate in this study or the discussion board will have no bearing on your grades or class standing. You will have 10 minutes at the end of each class session to do either of the tasks.

How long will I take part in this research study?

I expect that this study will take about 10 minutes to complete. Since you are expected to do the task at least twice a week, it will be in total 20 minutes a week. The entire study will take place online. You will have 10 minutes at the end of each class session to do the task.

What will happen if I take part in this research study?

If you agree to take part in this study, I will first ask you to indicate your consent to participate. It is comprised of one online survey. If you agree to participate in this study, you will be asked to do the following procedures:

· Go to chat.mark4650.com, sign up or log in and start chatting with the assigned agent to you. And then answer questions about your interactions with the characters

· Complete tasks on the computer related to human judgment and decision making

Study Participation and Early Withdrawal

Your involvement in the study is voluntary and your decision to participate in this study or the discussion board will have no bearing on your grades or class standing. You can do early withdrawal at any time during the task however you will receive a pro-rated credit for your participation. If you decide to withdraw from this study, the information that you have already provided will be kept confidential and you will get half of the credit. Weekly participation in this task will grant you 10% of your final grade. Each week has an equal weight distribution of credits and if you withdraw early in some surveys, you will get half of the credit for that week.

What are the risks of taking part in this research study?

Risks of Completing Tasks

NA

Loss of Confidentiality

This research involves the transmission of data over the Internet. Every reasonable effort has been taken to ensure the effective use of available technology; however, confidentiality during online communication cannot be guaranteed.

The main risk of allowing me to use and store your information for research is a potential loss of privacy. I will protect your privacy by keeping the personally identifiable information you need to reveal to receive your incentive separate from your responses in the study.

Are there any benefits from being in this research study?

There are no direct benefits to you for participating in this study. Others may benefit in the future from the information that is learned in this study.

What alternatives are available?

You may choose to participate in the discussion board instead of this survey. Participation in the discussion board will require similar amount of time and effort as participating in the survey. The details of the discussion board participation will be available on the eLC page of the course.

How Will You Keep My Study Records Confidential?

First of all, we don't ask any personal question in the survey. All the questions are general considering your perceptions of the virtual character you interacted with and no question about the content of chat. And also for the data analysis, I will keep the records of this study confidential by separating any personally identifiable information collected (e.g., your name and UGA Id) from your responses. I will make every effort to keep your records confidential. Your name and UGA Id will be kept until end of the semester. After the end of semester, all the direct/indirect identifiers will be deleted and all the data will be completely anonymous.

The following people or groups may review your study records for purposes such as quality control or safety:

· The Researcher and any member of her research team

· The Institutional Review Board at the University of Georgia. The Institutional Review Board is a group of people who review human research studies for safety and protection of people who take part in the studies.

The study data will be stored in the office of the investigator or on password-protected computers/hard-drives/shared drives with University of Georgia antivirus and security software.

The results of this research study may be published or used for teaching. I will not put identifiable information on data that are used for these purposes.

Sending Study Information to Research Collaborators Outside University of Georgia

In compliance with data sharing practices of the Association for Psychological Science and American Psychological Association, I will make de-identified data from any published study available to researchers who request it. De-identified information obtained from this research may be used for future studies or shared with other researchers without obtaining your additional consent.

Will I get paid for taking part in this research study?

You will get course credit by participating in this survey, and no monetary payment is involved.

What will it cost me to take part in this research study?

There are no costs to you for taking part in this research study.

If you have any questions about this research project, please feel free to call me at 818-802-3201 or send an e-mail to elham.yazdani@uga.edu. Questions or concerns about your rights as a research participant should be directed to The Chairperson, University of Georgia Institutional Review Board; telephone (706) 542-3199; email address irb@uga.edu.

Thank you for your consideration! Please keep this letter for your records.

Sincerely,

Elham Yazdani`;

export default function ConsentForm({ onAccept }) {
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!consentAccepted) {
      setError('You must accept the consent form to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await submitConsent();
      
      // Store consent acceptance in localStorage as backup
      localStorage.setItem('consent_accepted', 'true');
      
      // Call onAccept callback to proceed to next step
      if (onAccept) {
        onAccept();
      }
    } catch (err) {
      console.error('Consent submission error:', err);
      const errorMessage = err.message || 'Failed to submit consent. Please try again.';
      
      // Handle specific error cases
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('Session expired. Please log in again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        bgcolor: '#f5f5f5'
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          maxWidth: '800px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 3, fontWeight: 600 }}>
          Research Study Consent Form
        </Typography>

        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: '#f9f9f9',
            borderRadius: 1,
            border: '1px solid #e0e0e0',
            maxHeight: '400px',
            overflowY: 'auto',
            whiteSpace: 'pre-line',
            fontSize: '14px',
            lineHeight: 1.6
          }}
        >
          {CONSENT_TEXT}
        </Box>

        <form onSubmit={handleSubmit}>
          <FormControlLabel
            control={
              <Checkbox
                checked={consentAccepted}
                onChange={(e) => {
                  setConsentAccepted(e.target.checked);
                  if (error) setError(null);
                }}
                required
                sx={{ '& .MuiSvgIcon-root': { fontSize: 28 } }}
              />
            }
            label={
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                I have read and understood the consent form. I am 18 years of age or older and agree to participate in this research study.
              </Typography>
            }
            sx={{ mb: 3 }}
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={!consentAccepted || loading}
            sx={{ mt: 2 }}
          >
            {loading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Submitting...
              </>
            ) : (
              'I Accept - Continue to Survey'
            )}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}

