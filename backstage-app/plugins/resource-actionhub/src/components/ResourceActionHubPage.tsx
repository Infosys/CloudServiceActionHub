import { Content, Page } from '@backstage/core-components';
import { FormSection } from './FormSection';
import { Header } from '@backstage/core-components';

export const ResourceActionHubPage = () => (
  <Page themeId="tool">
    <Header title="Cloud Reseorce Action Hub" />
    <Content>
      <FormSection />
    </Content>
  </Page>
);
