'use strict';
/* Email/password account experience for Placement Atlas.
   Supabase Auth handles password storage, verification and recovery. */
(()=>{
  const MIN_PASSWORD_LENGTH=12;
  const ERROR='cloudAuthError';
  const byId=(root,id)=>root.querySelector('#'+id);
  const emailIsValid=input=>input.value.trim()!=='' && input.checkValidity();
  const recoveryUrl=base=>base+(base.includes('?')?'&':'?')+'atlas_auth=recovery';

  const open=({client,googleClientId,redirectUrl,initialMode='signin'})=>{
    if(!client)return;
    const existing=document.querySelector('.cloudOverlay[data-atlas-auth="true"]');
    if(existing){
      existing.dispatchEvent(new CustomEvent('atlas:auth-mode',{detail:initialMode}));
      return;
    }
    const overlay=document.createElement('div');
    overlay.className='cloudOverlay';
    overlay.dataset.atlasAuth='true';
    overlay.innerHTML=[
      '<section class="cloudDialog cloudPasswordDialog" role="dialog" aria-modal="true" aria-labelledby="cloudDialogTitle">',
      '<button type="button" class="cloudClose" aria-label="Close sign-in dialog">×</button>',
      '<div class="cloudEyebrow">PLACEMENT ATLAS</div>',
      '<h2 id="cloudDialogTitle">Sign in</h2>',
      '<p class="cloudLead" id="cloudDialogLead">Access your saved programmes, preferences and shortlist.</p>',
      '<div class="cloudAuthTabs" id="cloudAuthTabs" role="group" aria-label="Account options">',
      '<button type="button" data-auth-mode="signin" aria-pressed="true">Sign in</button>',
      '<button type="button" data-auth-mode="signup" aria-pressed="false">Create account</button>',
      '</div>',
      '<div id="cloudGoogleRegion"><button type="button" class="btn cloudGoogleButton" id="cloudGoogleSignIn"><span aria-hidden="true">G</span> Continue with Google</button></div>',
      '<div class="cloudOr" id="cloudAuthDivider"><span>or with email</span></div>',
      '<form id="cloudPasswordForm" novalidate>',
      '<label class="cloudEmailLabel" for="cloudEmail">Email address</label>',
      '<input class="cloudAuthInput" id="cloudEmail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required>',
      '<label class="cloudEmailLabel" for="cloudPassword">Password</label>',
      '<div class="cloudPasswordField"><input class="cloudAuthInput" id="cloudPassword" type="password" autocomplete="current-password" minlength="12" placeholder="Enter your password" required>',
      '<button class="cloudVisibility" type="button" data-toggle-password="cloudPassword" aria-label="Show password" aria-pressed="false">Show</button></div>',
      '<div id="cloudConfirmWrap" hidden>',
      '<label class="cloudEmailLabel" for="cloudConfirmPassword">Confirm password</label>',
      '<div class="cloudPasswordField"><input class="cloudAuthInput" id="cloudConfirmPassword" type="password" autocomplete="new-password" minlength="12" placeholder="Re-enter your password">',
      '<button class="cloudVisibility" type="button" data-toggle-password="cloudConfirmPassword" aria-label="Show password confirmation" aria-pressed="false">Show</button></div>',
      '</div>',
      '<p id="cloudPasswordHelp" class="cloudPasswordHelp" hidden>Use at least 12 characters. A longer, unique password is better.</p>',
      '<button class="btn primary cloudAuthSubmit" id="cloudPasswordSubmit" type="submit">Sign in</button>',
      '</form>',
      '<form id="cloudForgotForm" novalidate hidden>',
      '<label class="cloudEmailLabel" for="cloudForgotEmail">Email address</label>',
      '<input class="cloudAuthInput" id="cloudForgotEmail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required>',
      '<button class="btn primary cloudAuthSubmit" type="submit">Send reset link</button>',
      '</form>',
      '<form id="cloudRecoveryForm" novalidate hidden>',
      '<label class="cloudEmailLabel" for="cloudNewPassword">New password</label>',
      '<div class="cloudPasswordField"><input class="cloudAuthInput" id="cloudNewPassword" type="password" autocomplete="new-password" minlength="12" placeholder="At least 12 characters" required>',
      '<button class="cloudVisibility" type="button" data-toggle-password="cloudNewPassword" aria-label="Show new password" aria-pressed="false">Show</button></div>',
      '<label class="cloudEmailLabel" for="cloudNewConfirm">Confirm new password</label>',
      '<input class="cloudAuthInput" id="cloudNewConfirm" type="password" autocomplete="new-password" minlength="12" required>',
      '<p class="cloudPasswordHelp">Use at least 12 characters and avoid passwords used elsewhere.</p>',
      '<button class="btn primary cloudAuthSubmit" type="submit">Update password</button>',
      '</form>',
      '<form id="cloudLinkForm" novalidate hidden>',
      '<label class="cloudEmailLabel" for="cloudLinkEmail">Email address</label>',
      '<input class="cloudAuthInput" id="cloudLinkEmail" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com" required>',
      '<button class="btn primary cloudAuthSubmit" type="submit">Send sign-in link</button>',
      '</form>',
      '<form id="cloudOtpForm" novalidate hidden>',
      '<label class="cloudEmailLabel" for="cloudOtpCode">Six-digit email code</label>',
      '<input class="cloudAuthInput cloudOtpCode" id="cloudOtpCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" aria-describedby="cloudAuthFine" required>',
      '<button class="btn primary cloudAuthSubmit" type="submit">Verify code</button>',
      '<button class="cloudTextAction cloudOtpResend" id="cloudOtpResend" type="button">Request another code</button>',
      '</form>',
      '<div class="cloudAuthExtras" id="cloudAuthExtras">',
      '<button type="button" class="cloudTextAction" id="cloudForgotButton">Forgot password?</button>',
      '<button type="button" class="cloudTextAction" id="cloudLinkButton">Email me a link or code</button>',
      '</div>',
      '<button class="cloudTextAction cloudBack" type="button" id="cloudBackButton" hidden>Back to sign in</button>',
      '<p class="cloudFine" id="cloudAuthFine">Don’t have an account? Choose Create account above.</p>',
      '<p class="cloudPrivacy">Your workspace is private to your account. <a href="/privacy.html" target="_blank" rel="noopener noreferrer">Privacy policy</a></p>',
      '<p class="cloudError" id="cloudAuthError" role="status" aria-live="polite"></p>',
      '</section>'
    ].join('');
    document.body.appendChild(overlay);

    const get=id=>byId(overlay,id);
    const errorNode=get(ERROR);
    const setStatus=(message,tone='error')=>{
      errorNode.textContent=message||'';
      errorNode.dataset.tone=tone;
    };
    const close=()=>overlay.remove();
    const pwdForm=get('cloudPasswordForm');
    const pw=get('cloudPassword');
    const conf=get('cloudConfirmPassword');
    const email=get('cloudEmail');
    let pendingOtpEmail='';
    let mode='signin';

    function setMode(next){
      mode=['signin','signup','forgot','link','otp','recovery'].includes(next)?next:'signin';
      const accountMode=mode==='signin'||mode==='signup';
      get('cloudAuthTabs').hidden=!accountMode;
      get('cloudGoogleRegion').hidden=!accountMode;
      get('cloudAuthDivider').hidden=!accountMode;
      pwdForm.hidden=!accountMode;
      get('cloudForgotForm').hidden=mode!=='forgot';
      get('cloudRecoveryForm').hidden=mode!=='recovery';
      get('cloudLinkForm').hidden=mode!=='link';
      get('cloudOtpForm').hidden=mode!=='otp';
      get('cloudConfirmWrap').hidden=mode!=='signup';
      get('cloudPasswordHelp').hidden=mode!=='signup';
      get('cloudAuthExtras').hidden=mode!=='signin';
      get('cloudBackButton').hidden=accountMode;
      conf.required=mode==='signup';
      pw.autocomplete=mode==='signup'?'new-password':'current-password';
      pw.placeholder=mode==='signup'?'At least 12 characters':'Enter your password';
      get('cloudPasswordSubmit').textContent=mode==='signup'?'Create account':'Sign in';
      for(const button of overlay.querySelectorAll('[data-auth-mode]')){
        button.setAttribute('aria-pressed',String(button.dataset.authMode===mode));
      }
      const copy={
        signin:['Sign in','Access your saved programmes, preferences and shortlist.','New here? Choose Create account above.'],
        signup:['Create your account','Save your shortlist and preferences securely across devices.','We’ll email you a link to verify your address.'],
        forgot:['Reset your password','We’ll email a secure password reset link if an account exists.','Check your inbox, including spam, after submitting.'],
        link:['Sign in without a password','We’ll email a secure link and a temporary six-digit code. Choose either to sign in.','This is for existing Placement Atlas accounts.'],
        otp:['Check your email','Enter the six-digit code we sent, or open the sign-in link instead.','The code expires after a short time. Return to request a new one if needed.'],
        recovery:['Set a new password','Choose a new password to secure your Placement Atlas account.','After updating your password, you can continue to your workspace.']
      };
      get('cloudDialogTitle').textContent=copy[mode][0];
      get('cloudDialogLead').textContent=copy[mode][1];
      get('cloudAuthFine').textContent=copy[mode][2];
      setStatus('');
      if(mode==='forgot')get('cloudForgotEmail').value=email.value.trim();
      if(mode==='link')get('cloudLinkEmail').value=pendingOtpEmail||email.value.trim();
      if(mode==='otp')get('cloudOtpCode').value='';
    }
    overlay.addEventListener('atlas:auth-mode',event=>setMode(event.detail));
    overlay.querySelector('.cloudClose').addEventListener('click',close);
    overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
    overlay.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
    overlay.querySelectorAll('[data-auth-mode]').forEach(button=>{
      button.addEventListener('click',()=>setMode(button.dataset.authMode));
    });
    overlay.querySelectorAll('[data-toggle-password]').forEach(button=>{
      button.addEventListener('click',()=>{
        const target=get(button.dataset.togglePassword);
        const revealing=target.type==='password';
        target.type=revealing?'text':'password';
        button.textContent=revealing?'Hide':'Show';
        button.setAttribute('aria-label',revealing?'Hide password':'Show password');
        button.setAttribute('aria-pressed',String(revealing));
      });
    });
    get('cloudForgotButton').addEventListener('click',()=>setMode('forgot'));
    get('cloudLinkButton').addEventListener('click',()=>setMode('link'));
    get('cloudOtpResend').addEventListener('click',()=>setMode('link'));
    get('cloudBackButton').addEventListener('click',()=>setMode('signin'));

    async function perform(button,workingText,action){
      if(button.disabled)return;
      const label=button.textContent;
      button.disabled=true;
      button.textContent=workingText;
      setStatus('');
      try{await action();}
      catch(err){setStatus(err?.message||'Something went wrong. Please try again.');}
      finally{
        if(button.isConnected){button.disabled=false;button.textContent=label;}
      }
    }
    pwdForm.addEventListener('submit',event=>{
      event.preventDefault();
      if(!emailIsValid(email)){setStatus('Enter a valid email address.');email.focus();return;}
      if(mode==='signup'&&pw.value.length<MIN_PASSWORD_LENGTH){
        setStatus('Use at least 12 characters for your password.');pw.focus();return;
      }
      if(mode==='signup'&&pw.value!==conf.value){
        setStatus('The passwords don’t match.');conf.focus();return;
      }
      if(!pw.value){setStatus('Enter your password.');pw.focus();return;}
      const button=get('cloudPasswordSubmit');
      perform(button,mode==='signup'?'Creating account…':'Signing in…',async()=>{
        const address=email.value.trim();
        const result=mode==='signup'
          ?await client.auth.signUp({email:address,password:pw.value,options:{emailRedirectTo:redirectUrl()}})
          :await client.auth.signInWithPassword({email:address,password:pw.value});
        if(result.error)throw result.error;
        if(result.data?.session){
          pw.value='';conf.value='';close();
          return;
        }
        pw.value='';conf.value='';
        setStatus('Check your inbox for a verification email. Follow its link to activate your account, then sign in.','success');
      });
    });
    get('cloudForgotForm').addEventListener('submit',event=>{
      event.preventDefault();
      const input=get('cloudForgotEmail');
      if(!emailIsValid(input)){setStatus('Enter a valid email address.');input.focus();return;}
      perform(event.submitter||get('cloudForgotForm').querySelector('button[type=submit]'),'Sending…',async()=>{
        const result=await client.auth.resetPasswordForEmail(input.value.trim(),{redirectTo:recoveryUrl(redirectUrl())});
        if(result.error)throw result.error;
        setStatus('If that email address has an account, a password reset link is on its way.','success');
      });
    });
    get('cloudLinkForm').addEventListener('submit',event=>{
      event.preventDefault();
      const input=get('cloudLinkEmail');
      if(!emailIsValid(input)){setStatus('Enter a valid email address.');input.focus();return;}
      perform(event.submitter||get('cloudLinkForm').querySelector('button[type=submit]'),'Sending…',async()=>{
        // Passwordless sign-in must not silently create new accounts.
        const result=await client.auth.signInWithOtp({email:input.value.trim(),options:{emailRedirectTo:redirectUrl(),shouldCreateUser:false}});
        if(result.error){
          // Avoid disclosing whether a particular email has an account.
          if(/rate|limit|too many/i.test(result.error.message||''))throw new Error('Please wait before requesting another code.');
          throw new Error('Could not send a sign-in email right now. Please try again.');
        }
        pendingOtpEmail=input.value.trim();
        setMode('otp');
        setStatus('Check your inbox for the sign-in link or six-digit code.','success');
      });
    });
    get('cloudOtpForm').addEventListener('submit',event=>{
      event.preventDefault();
      const input=get('cloudOtpCode');
      const token=input.value.trim();
      if(!pendingOtpEmail){
        setMode('link');
        setStatus('Enter your email and request a new code.');return;
      }
      if(!/^[0-9]{6}$/.test(token)){
        setStatus('Enter the six-digit code from the email.');
        input.focus();return;
      }
      perform(event.submitter||get('cloudOtpForm').querySelector('button[type=submit]'),'Verifying…',async()=>{
        const result=await client.auth.verifyOtp({email:pendingOtpEmail,token,type:'email'});
        if(result.error){
          throw new Error('That code could not be verified. Check the digits or request another code.');
        }
        if(!result.data?.session){
          setStatus('Verification is still pending. You can also use the link in your email.');
          return;
        }
        pendingOtpEmail='';
        input.value='';
        close();
      });
    });
    get('cloudRecoveryForm').addEventListener('submit',event=>{
      event.preventDefault();
      const one=get('cloudNewPassword'),two=get('cloudNewConfirm');
      if(one.value.length<MIN_PASSWORD_LENGTH){setStatus('Use at least 12 characters.');one.focus();return;}
      if(one.value!==two.value){setStatus('The passwords don’t match.');two.focus();return;}
      perform(event.submitter||get('cloudRecoveryForm').querySelector('button[type=submit]'),'Updating…',async()=>{
        const {error}=await client.auth.updateUser({password:one.value});
        if(error)throw error;
        one.value='';two.value='';
        const url=new URL(window.location.href);
        url.searchParams.delete('atlas_auth');
        window.history.replaceState({},'',url.pathname+url.search+url.hash);
        setMode('signin');
        setStatus('Your password has been updated. You can now sign in with it.','success');
      });
    });
    // Keep the existing native Google Identity Services flow and its OAuth fallback.
    const googleButton=get('cloudGoogleSignIn');
    window.PlacementAtlasGoogle?.mount({overlay,button:googleButton,client,clientId:googleClientId});
    googleButton.addEventListener('click',async()=>{
      googleButton.disabled=true;googleButton.textContent='Opening Google…';
      const result=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirectUrl(),queryParams:{prompt:'select_account'}}});
      if(result.error){setStatus(result.error.message);googleButton.disabled=false;googleButton.textContent='Continue with Google';}
    });
    setMode(initialMode);
    return overlay;
  };
  window.PlacementAtlasPasswordAuth={open};
})();