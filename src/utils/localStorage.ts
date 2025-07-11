import { AppConfig, Campaign, CampaignForm, Group, NpsResponse, Situation, Source, User, UserProfile, Subscription, Contact } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_USER: 'auth_user',
  USER_PROFILE: 'user_profile',
  SUBSCRIPTION: 'subscription',
  CAMPAIGNS: 'campaigns',
  RESPONSES: 'responses',
  FORMS: 'forms',
  SOURCES: 'sources',
  SITUATIONS: 'situations',
  GROUPS: 'groups',
  CONTACTS: 'contacts',
  CONFIG: 'app_config',
};

// Default data
const DEFAULT_CONFIG: AppConfig = {
  themeColor: '#073143',
  language: 'en',
  company: {
    name: '',
    document: '',
    address: '',
    email: '',
    phone: '',
  },
  integrations: {
    smtp: {
      enabled: false,
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      fromName: '',
      fromEmail: '',
    },
    zenvia: {
      email: {
        enabled: false,
        apiKey: '',
        fromEmail: '',
        fromName: '',
      },
      sms: {
        enabled: false,
        apiKey: '',
        from: '',
      },
      whatsapp: {
        enabled: false,
        apiKey: '',
        from: '',
      },
    },
  },
};

// Authentication
export const getAuthUser = (): User | null => {
  const userData = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
  return userData ? JSON.parse(userData) : null;
};

export const setAuthUser = (user: User): void => {
  localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
};

export const logout = (): void => {
  localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
};

// User Profile Management
export const getUserProfile = (): UserProfile | null => {
  const profileData = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  if (profileData) {
    return JSON.parse(profileData);
  }
  
  // Create default profile from auth user if exists
  const authUser = getAuthUser();
  if (authUser) {
    const defaultProfile: UserProfile = {
      id: authUser.id,
      name: authUser.name,
      email: authUser.email,
      phone: authUser.phone || '',
      company: authUser.company || '',
      position: authUser.position || '',
      avatar: authUser.avatar || '',
      preferences: {
        language: 'pt-BR',
        theme: 'light',
        emailNotifications: {
          newResponses: true,
          weeklyReports: true,
          productUpdates: false,
        },
      },
      createdAt: authUser.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveUserProfile(defaultProfile);
    return defaultProfile;
  }
  
  return null;
};

export const saveUserProfile = (profile: UserProfile): UserProfile => {
  const updatedProfile = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
  
  // Also update auth user with basic info
  const authUser = getAuthUser();
  if (authUser) {
    const updatedAuthUser: User = {
      ...authUser,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      company: profile.company,
      position: profile.position,
      avatar: profile.avatar,
      updatedAt: new Date().toISOString(),
    };
    setAuthUser(updatedAuthUser);
  }
  
  return updatedProfile;
};

// Subscription Management
export const getSubscription = (): Subscription | null => {
  const subscriptionData = localStorage.getItem(STORAGE_KEYS.SUBSCRIPTION);
  if (subscriptionData) {
    return JSON.parse(subscriptionData);
  }
  
  // Create default subscription
  const authUser = getAuthUser();
  if (authUser) {
    const defaultSubscription: Subscription = {
      id: uuidv4(),
      userId: authUser.id,
      planId: 'pro',
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      cancelAtPeriodEnd: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveSubscription(defaultSubscription);
    return defaultSubscription;
  }
  
  return null;
};

export const saveSubscription = (subscription: Subscription): Subscription => {
  const updatedSubscription = {
    ...subscription,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem(STORAGE_KEYS.SUBSCRIPTION, JSON.stringify(updatedSubscription));
  return updatedSubscription;
};

// Campaign management
export const getCampaigns = (): Campaign[] => {
  const campaigns = localStorage.getItem(STORAGE_KEYS.CAMPAIGNS);
  return campaigns ? JSON.parse(campaigns) : [];
};

export const saveCampaign = (campaign: Campaign): Campaign => {
  const campaigns = getCampaigns();
  const newCampaign = {
    ...campaign,
    id: campaign.id || uuidv4(),
    createdAt: campaign.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const index = campaigns.findIndex(c => c.id === newCampaign.id);
  
  if (index >= 0) {
    campaigns[index] = newCampaign;
  } else {
    campaigns.push(newCampaign);
  }
  
  localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(campaigns));
  return newCampaign;
};

export const deleteCampaign = (id: string): boolean => {
  const campaigns = getCampaigns();
  const filtered = campaigns.filter(c => c.id !== id);
  
  if (filtered.length !== campaigns.length) {
    localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify(filtered));
    
    // Also clean up related data
    deleteCampaignData(id);
    
    return true;
  }
  
  return false;
};

// Helper function to delete all campaign-related data
const deleteCampaignData = (campaignId: string): void => {
  // Delete campaign form
  const formKey = `forms_${campaignId}`;
  localStorage.removeItem(formKey);
  
  // Delete campaign responses
  const allResponses = getResponses();
  const filteredResponses = allResponses.filter(r => r.campaignId !== campaignId);
  localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(filteredResponses));
};

// NPS Responses
export const getResponses = (campaignId?: string): NpsResponse[] => {
  const responses = localStorage.getItem(STORAGE_KEYS.RESPONSES);
  const allResponses = responses ? JSON.parse(responses) : [];
  
  // Ensure backward compatibility - add formResponses if missing
  const normalizedResponses = allResponses.map((response: any) => ({
    ...response,
    formResponses: response.formResponses || {}
  }));
  
  return campaignId 
    ? normalizedResponses.filter((r: NpsResponse) => r.campaignId === campaignId)
    : normalizedResponses;
};

export const saveResponse = (response: NpsResponse): NpsResponse => {
  const responses = getResponses();
  const newResponse = {
    ...response,
    id: response.id || uuidv4(),
    createdAt: response.createdAt || new Date().toISOString(),
    formResponses: response.formResponses || {}
  };
  
  console.log('Saving response:', newResponse);
  
  const index = responses.findIndex((r: NpsResponse) => r.id === newResponse.id);
  
  if (index >= 0) {
    responses[index] = newResponse;
  } else {
    responses.push(newResponse);
  }
  
  localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(responses));
  return newResponse;
};

// Forms
export const getCampaignForm = (campaignId: string): CampaignForm | null => {
  const formKey = `forms_${campaignId}`;
  const formData = localStorage.getItem(formKey);
  
  if (!formData) {
    console.log(`No form found for campaign ${campaignId}`);
    return null;
  }
  
  const form = JSON.parse(formData);
  
  // Ensure fields are properly ordered
  if (form.fields) {
    form.fields = form.fields
      .map((field: any, index: number) => ({
        ...field,
        order: field.order !== undefined ? field.order : index
      }))
      .sort((a: any, b: any) => a.order - b.order);
  }
  
  console.log(`Loaded form for campaign ${campaignId}:`, form.fields?.map((f: any) => ({ id: f.id, label: f.label, order: f.order })));
  
  return form;
};

export const saveCampaignForm = (form: CampaignForm): CampaignForm => {
  const formKey = `forms_${form.campaignId}`;
  
  // Ensure all fields have proper order values
  const fieldsWithOrder = form.fields.map((field, index) => ({
    ...field,
    order: field.order !== undefined ? field.order : index
  }));
  
  // Sort fields by order to maintain consistency
  const sortedFields = fieldsWithOrder.sort((a, b) => a.order - b.order);
  
  const newForm = {
    ...form,
    id: form.id || uuidv4(),
    fields: sortedFields
  };
  
  console.log(`Saving form for campaign ${form.campaignId}:`, sortedFields.map(f => ({ id: f.id, label: f.label, order: f.order })));
  
  localStorage.setItem(formKey, JSON.stringify(newForm));
  return newForm;
};

// Sources
export const getSources = (): Source[] => {
  const sources = localStorage.getItem(STORAGE_KEYS.SOURCES);
  return sources ? JSON.parse(sources) : [];
};

export const saveSource = (source: Source): Source => {
  const sources = getSources();
  const newSource = {
    ...source,
    id: source.id || uuidv4(),
  };
  
  const index = sources.findIndex(s => s.id === newSource.id);
  
  if (index >= 0) {
    sources[index] = newSource;
  } else {
    sources.push(newSource);
  }
  
  localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(sources));
  return newSource;
};

export const deleteSource = (id: string): boolean => {
  const sources = getSources();
  const filtered = sources.filter(s => s.id !== id);
  
  if (filtered.length !== sources.length) {
    localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(filtered));
    return true;
  }
  
  return false;
};

// Situations
export const getSituations = (): Situation[] => {
  const situations = localStorage.getItem(STORAGE_KEYS.SITUATIONS);
  return situations ? JSON.parse(situations) : [];
};

export const saveSituation = (situation: Situation): Situation => {
  const situations = getSituations();
  const newSituation = {
    ...situation,
    id: situation.id || uuidv4(),
  };
  
  const index = situations.findIndex(s => s.id === newSituation.id);
  
  if (index >= 0) {
    situations[index] = newSituation;
  } else {
    situations.push(newSituation);
  }
  
  localStorage.setItem(STORAGE_KEYS.SITUATIONS, JSON.stringify(situations));
  return newSituation;
};

export const deleteSituation = (id: string): boolean => {
  const situations = getSituations();
  const filtered = situations.filter(s => s.id !== id);
  
  if (filtered.length !== situations.length) {
    localStorage.setItem(STORAGE_KEYS.SITUATIONS, JSON.stringify(filtered));
    return true;
  }
  
  return false;
};

// Groups
export const getGroups = (): Group[] => {
  const groups = localStorage.getItem(STORAGE_KEYS.GROUPS);
  return groups ? JSON.parse(groups) : [];
};

export const saveGroup = (group: Group): Group => {
  const groups = getGroups();
  const newGroup = {
    ...group,
    id: group.id || uuidv4(),
  };
  
  const index = groups.findIndex(g => g.id === newGroup.id);
  
  if (index >= 0) {
    groups[index] = newGroup;
  } else {
    groups.push(newGroup);
  }
  
  localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
  return newGroup;
};

export const deleteGroup = (id: string): boolean => {
  const groups = getGroups();
  const filtered = groups.filter(g => g.id !== id);
  
  if (filtered.length !== groups.length) {
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(filtered));
    return true;
  }
  
  return false;
};

// Contacts
export const getContacts = (): Contact[] => {
  const contacts = localStorage.getItem(STORAGE_KEYS.CONTACTS);
  return contacts ? JSON.parse(contacts) : [];
};

export const saveContact = (contact: Contact): Contact => {
  const contacts = getContacts();
  const newContact = {
    ...contact,
    id: contact.id || uuidv4(),
    createdAt: contact.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  const index = contacts.findIndex(c => c.id === newContact.id);
  
  if (index >= 0) {
    contacts[index] = newContact;
  } else {
    contacts.push(newContact);
  }
  
  localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
  return newContact;
};

export const deleteContact = (id: string): boolean => {
  const contacts = getContacts();
  const filtered = contacts.filter(c => c.id !== id);
  
  if (filtered.length !== contacts.length) {
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(filtered));
    return true;
  }
  
  return false;
};

export const getContactsByGroup = (groupId: string): Contact[] => {
  const contacts = getContacts();
  return contacts.filter(contact => contact.groupIds.includes(groupId));
};

export const searchContacts = (query: string): Contact[] => {
  const contacts = getContacts();
  const lowercaseQuery = query.toLowerCase();
  
  return contacts.filter(contact => 
    contact.name.toLowerCase().includes(lowercaseQuery) ||
    contact.email.toLowerCase().includes(lowercaseQuery) ||
    contact.phone.includes(query) ||
    contact.company?.toLowerCase().includes(lowercaseQuery) ||
    contact.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

// App config
export const getAppConfig = (): AppConfig => {
  const config = localStorage.getItem(STORAGE_KEYS.CONFIG);
  return config ? JSON.parse(config) : DEFAULT_CONFIG;
};

export const saveAppConfig = (config: AppConfig): AppConfig => {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  return config;
};

// Initialize default data
export const initializeDefaultData = () => {
  // Only initialize if data doesn't exist
  if (!localStorage.getItem(STORAGE_KEYS.SOURCES)) {
    const defaultSources: Source[] = [
      { id: uuidv4(), name: 'WhatsApp', color: '#25D366' },
      { id: uuidv4(), name: 'Email', color: '#4285F4' },
      { id: uuidv4(), name: 'Telefone', color: '#FF9800' },
      { id: uuidv4(), name: 'Website', color: '#673AB7' },
    ];
    localStorage.setItem(STORAGE_KEYS.SOURCES, JSON.stringify(defaultSources));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SITUATIONS)) {
    const defaultSituations: Situation[] = [
      { id: uuidv4(), name: 'Respondido', color: '#4CAF50' },
      { id: uuidv4(), name: 'Pendente', color: '#FFC107' },
      { id: uuidv4(), name: 'Ignorado', color: '#F44336' },
    ];
    localStorage.setItem(STORAGE_KEYS.SITUATIONS, JSON.stringify(defaultSituations));
  }

  if (!localStorage.getItem(STORAGE_KEYS.GROUPS)) {
    const defaultGroups: Group[] = [
      { id: uuidv4(), name: 'Clientes Premium' },
      { id: uuidv4(), name: 'Clientes Regulares' },
      { id: uuidv4(), name: 'Testes Internos' },
    ];
    localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(defaultGroups));
  }

  if (!localStorage.getItem(STORAGE_KEYS.CONTACTS)) {
    const groups = getGroups();
    const defaultContacts: Contact[] = [
      {
        id: uuidv4(),
        name: 'João Silva',
        email: 'joao.silva@email.com',
        phone: '(11) 99999-1234',
        groupIds: groups.length > 0 ? [groups[0].id] : [],
        company: 'Tech Solutions',
        position: 'Gerente de TI',
        tags: ['cliente-vip', 'tecnologia'],
        notes: 'Cliente há 3 anos, sempre muito satisfeito com nossos serviços.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        name: 'Maria Santos',
        email: 'maria.santos@empresa.com',
        phone: '(11) 98888-5678',
        groupIds: groups.length > 1 ? [groups[1].id] : [],
        company: 'Marketing Pro',
        position: 'Diretora de Marketing',
        tags: ['marketing', 'parceiro'],
        notes: 'Interessada em expandir a parceria para novos projetos.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        name: 'Carlos Oliveira',
        email: 'carlos@startup.com',
        phone: '(11) 97777-9012',
        groupIds: groups.length > 0 ? [groups[0].id, groups[1].id] : [],
        company: 'StartupXYZ',
        position: 'CEO',
        tags: ['startup', 'inovação'],
        notes: 'Fundador de startup promissora, potencial para grandes projetos.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(defaultContacts));
  }

  if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
  }
};