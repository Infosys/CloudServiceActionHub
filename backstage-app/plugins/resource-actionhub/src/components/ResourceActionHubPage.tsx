import { Content, Page } from '@backstage/core-components';
import { FormSection } from './FormSection';
import { Header } from '@backstage/core-components';

export const ResourceActionHubPage = () => (
  <Page themeId="tool">
    <Header
            title={'Start Stop Hub'}
          />
    <Content>
      <FormSection />
    </Content>
  </Page>
);
